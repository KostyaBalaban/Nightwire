// Seeds demo data: a shared demo account for visitors, four demo contacts,
// 1:1 conversations and two groups.
//
//   cd backend && npm run seed
//
// Safe to run repeatedly against any database (including production): it only touches
// accounts whose email ends with DEMO_DOMAIN. Each run deletes those accounts, their
// messages and the groups they own, then recreates everything from scratch, so it also
// works as a "reset the demo" command.
//
// Seeded messages are stored unencrypted (isEncrypted: false) and demo accounts have no
// public key: visitors log in from their own browser, which never has the demo account's
// private key, so encrypted history would be unreadable for them.

import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { User } from "../src/modules/auth/user.schema.js";
import { Message } from "../src/modules/messaging/message.schema.js";
import { Group } from "../src/modules/groups/group.schema.js";

const DEMO_DOMAIN = "nightwire.demo";
const DEMO_LOGIN = `demo@${DEMO_DOMAIN}`;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "nightwire-demo";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();
const ago = (ms) => new Date(now - ms);

const PEOPLE = [
  {
    key: "demo",
    fullName: "Demo Visitor",
    email: DEMO_LOGIN,
    bio: "Shared demo account. Feel free to look around and send messages.",
    lastSeen: ago(0),
  },
  {
    key: "alice",
    fullName: "Alice Chen",
    email: `alice@${DEMO_DOMAIN}`,
    bio: "Product designer. Dark mode enthusiast.",
    lastSeen: ago(5 * MINUTE),
  },
  {
    key: "marcus",
    fullName: "Marcus Webb",
    email: `marcus@${DEMO_DOMAIN}`,
    bio: "Backend engineer · coffee → code",
    lastSeen: ago(40 * MINUTE),
  },
  {
    key: "sofia",
    fullName: "Sofia Rossi",
    email: `sofia@${DEMO_DOMAIN}`,
    bio: "QA lead. If it can break, I will find it.",
    lastSeen: ago(3 * HOUR),
  },
  {
    key: "daniel",
    fullName: "Daniel Kim",
    email: `daniel@${DEMO_DOMAIN}`,
    bio: "Weekend hiker, weekday frontend dev.",
    lastSeen: ago(2 * DAY),
  },
];

// [from, minutesAgo, text, extras]. extras: { reply: index, react: [[who, emoji]], edited, unread }
const DIRECT_CHATS = {
  alice: [
    ["alice", 26 * 60, "Hey! Welcome to NightWire 👋"],
    ["demo", 26 * 60 - 2, "Thanks! Looks slick. Is everything real-time?"],
    [
      "alice",
      26 * 60 - 3,
      "Yep: messages, typing indicators, read receipts and reactions all go over Socket.io.",
      { react: [["demo", "🔥"]] },
    ],
    [
      "alice",
      26 * 60 - 4,
      "Text in 1:1 chats is end-to-end encrypted when both sides have keys, so the server only stores ciphertext.",
    ],
    ["demo", 26 * 60 - 6, "Nice. How do I try that?", { reply: 3 }],
    [
      "alice",
      26 * 60 - 7,
      "Sign up with two accounts in two browsers and message each other. Look for the lock badge 🔒",
      { edited: true },
    ],
    ["alice", 12, "Did you check out the groups yet?", { unread: true }],
  ],
  marcus: [
    ["marcus", (3 * DAY) / MINUTE, "Deploy is green ✅"],
    ["demo", (3 * DAY) / MINUTE - 1, "Great work! Any issues with the WebSocket upgrade?"],
    [
      "marcus",
      (3 * DAY) / MINUTE - 3,
      "None. One service serves the API, Socket.io and the React build on the same origin, so cookies just work.",
      { react: [["demo", "👍"]] },
    ],
    ["demo", 50, "Can you review my PR later today?"],
    ["marcus", 45, "Sure, after lunch 🍜", { unread: true }],
    ["marcus", 44, "Ping me if it's urgent", { unread: true }],
  ],
  sofia: [
    ["sofia", (2 * DAY) / MINUTE, "Found a bug in the reply preview, fixed now 🐛"],
    ["demo", (2 * DAY) / MINUTE - 5, "You're the best"],
    ["sofia", (2 * DAY) / MINUTE - 6, "I know 😎", { react: [["demo", "😂"]] }],
    ["sofia", 5 * 60, "Tip: right-click a message to reply, react, edit or delete it."],
  ],
};

const GROUPS = [
  {
    name: "NightWire Team",
    description: "Product, design and engineering chat for the NightWire launch.",
    owner: "alice",
    admins: ["marcus"],
    members: ["demo", "sofia", "daniel"],
    messages: [
      ["alice", 30 * 60, "Morning team ☀️ How are we looking for the launch?"],
      ["marcus", 30 * 60 - 2, "Backend is ready. Rate limiting is on in production."],
      [
        "sofia",
        30 * 60 - 5,
        "Regression run passed. No blockers from QA 🎉",
        {
          react: [
            ["alice", "🎉"],
            ["marcus", "🎉"],
          ],
        },
      ],
      ["daniel", 30 * 60 - 8, "Dark theme polish is merged"],
      ["alice", 30 * 60 - 9, "Love it", { reply: 3 }],
      ["marcus", 90, "Who's up for a demo call at 5?"],
      ["sofia", 85, "Count me in", { react: [["marcus", "👍"]] }],
      ["daniel", 20, "Same here. I'll bring the screenshots"],
    ],
  },
  {
    name: "Weekend Hikers",
    description: "Trails, photos and carpool plans.",
    owner: "demo",
    admins: [],
    members: ["daniel", "alice"],
    messages: [
      ["demo", (4 * DAY) / MINUTE, "Created this group for weekend trips 🥾"],
      ["daniel", (4 * DAY) / MINUTE - 10, "Finally! I have a trail in mind"],
      [
        "alice",
        (4 * DAY) / MINUTE - 15,
        "I'm in if it's under 15 km 😅",
        { react: [["daniel", "😂"]] },
      ],
      ["daniel", 6 * 60, "Saturday, 8 am, meeting at the station?"],
      ["alice", 6 * 60 - 3, "Works for me"],
    ],
  },
];

async function removeExistingDemoData() {
  const demoUsers = await User.find({ email: { $regex: `@${DEMO_DOMAIN.replace(".", "\\.")}$` } })
    .select("_id")
    .lean();
  const ids = demoUsers.map((u) => u._id);
  if (!ids.length) return 0;

  const ownedGroups = await Group.find({ ownerId: { $in: ids } })
    .select("_id")
    .lean();
  const groupIds = ownedGroups.map((g) => g._id);

  await Message.deleteMany({
    $or: [{ senderId: { $in: ids } }, { receiverId: { $in: ids } }, { groupId: { $in: groupIds } }],
  });
  await Group.deleteMany({ _id: { $in: groupIds } });
  // Demo users may have joined groups owned by real users; take them out of those too.
  await Group.updateMany({}, { $pull: { members: { userId: { $in: ids } } } });
  await User.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

async function createUsers() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = {};
  for (const p of PEOPLE) {
    const { key, ...fields } = p;
    users[key] = await User.create({
      ...fields,
      password,
      emailVerified: true,
      isAdmin: false,
      publicKey: "",
    });
  }
  return users;
}

function buildMessage(users, [from, minutesAgo, text, extras = {}], base) {
  const createdAt = ago(minutesAgo * MINUTE);
  return {
    ...base,
    senderId: users[from]._id,
    text,
    isEncrypted: false,
    status: extras.unread ? "delivered" : "read",
    readAt: extras.unread ? undefined : createdAt,
    reactions: (extras.react || []).map(([who, emoji]) => ({ userId: users[who]._id, emoji })),
    isEdited: !!extras.edited,
    editedAt: extras.edited ? new Date(createdAt.getTime() + MINUTE) : undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

// Inserts messages one by one so that `reply` can point at an earlier message's _id.
async function insertThread(users, rows, baseFor) {
  const created = [];
  for (const row of rows) {
    const doc = buildMessage(users, row, baseFor(row));
    const replyIdx = row[3]?.reply;
    if (replyIdx !== undefined) {
      const target = created[replyIdx];
      doc.replyTo = target._id;
      doc.replyToSnippet = target.text;
    }
    // timestamps: false keeps the backdated createdAt/updatedAt instead of "now"
    const [msg] = await Message.insertMany([doc], { timestamps: false });
    created.push(msg);
  }
  return created.length;
}

async function createDirectChats(users) {
  let count = 0;
  for (const [partner, rows] of Object.entries(DIRECT_CHATS)) {
    count += await insertThread(users, rows, ([from]) => ({
      receiverId: users[from === "demo" ? partner : "demo"]._id,
    }));
  }
  return count;
}

async function createGroups(users) {
  let count = 0;
  for (const g of GROUPS) {
    const oldest = Math.max(...g.messages.map((m) => m[1])) + 5;
    const joinedAt = ago(oldest * MINUTE);
    const group = await Group.create({
      name: g.name,
      description: g.description,
      ownerId: users[g.owner]._id,
      members: [
        { userId: users[g.owner]._id, role: "owner", joinedAt },
        ...g.admins.map((k) => ({ userId: users[k]._id, role: "admin", joinedAt })),
        ...g.members.map((k) => ({ userId: users[k]._id, role: "member", joinedAt })),
      ],
    });
    count += await insertThread(users, g.messages, () => ({ groupId: group._id }));
  }
  return count;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("[Seed] MONGO_URI is not set (backend/.env)");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[Seed] Connected → ${mongoose.connection.host}/${mongoose.connection.name}`);

  // The first account ever registered becomes the app admin. Refuse to seed an empty
  // database so that role still goes to the owner's real account, not to a visitor.
  const hasAdmin = await User.exists({ isAdmin: true });
  if (!hasAdmin) {
    console.error(
      "[Seed] No admin account found. Sign up with your own account first " +
        "(the first account becomes the admin), then run the seed again.",
    );
    process.exit(1);
  }

  const removed = await removeExistingDemoData();
  const users = await createUsers();
  const direct = await createDirectChats(users);
  const group = await createGroups(users);

  console.log(`[Seed] Removed ${removed} old demo accounts`);
  console.log(
    `[Seed] Created ${PEOPLE.length} users, ${direct} direct messages, ` +
      `${GROUPS.length} groups with ${group} messages`,
  );
  console.log(`[Seed] Demo login: ${DEMO_LOGIN} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("[Seed] Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
