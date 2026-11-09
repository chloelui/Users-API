import { Router } from "express";
import multer from "multer";
import pool from "../db.js";

const router = Router();

// ---------- file uploads ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const type = file.mimetype ?? file.mimeType ?? "";
    if (type.startsWith("image/")) return cb(null, true);
    const err = new Error("Only image files are allowed.");
    err.status = 400;
    cb(err);
  },
});

// ---------- helpers ----------
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Converts database row (snake case) to JSON shape the frontend uses (camel case)
function toApiUser(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        major: row.major,
        graduationYear: String(row.graduation_year),
        bio: row.bio,
        profilePicture: row.profile_picture_url,
        diningHalls: row.dining_halls,
        favoriteFoods: row.favorite_foods,
        createdAt: row.created_at,
    };
}

function fileToDataUrl(file) {
  const type = file.mimetype ?? file.mimeType;
  return `data:${type};base64,${file.buffer.toString("base64")}`;
}

function parseList(value) {
    if (value === undefined) return undefined;
    let list = value;
    if (typeof value === "string") {
        try {
            list = JSON.parse(value);
        } catch {
            return null;
        }
    }
    if (!Array.isArray(list) || !list.every((item) => typeof item === "string")) return null;
    return list.map((item) => item.trim()).filter(Boolean);
}

const textRules = {
    firstName: { message: "First name is required.", valid: (v) => v !== "" },
    lastName: { message: "Last name is required.", valid: (v) => v !== "" },
    email: { message: "Enter a valid email address.", valid: (v) => /^\S+@\S+\.\S+$/.test(v) },
    major: { message: "Major is required.", valid: (v) => v !== "" },
    graduationYear: { message: "Graduation year must be 4 digits.", valid: (v) => /^\d{4}$/.test(v) },
    bio: { message: "", valid: () => true, optional: true },
};

// requireAll = true for POST, false for PUT (only what updated)
function readFields(body, { requireAll }) {
    const errors = [];
    const values = {};

    for (const [key, rule] of Object.entries(textRules)) {
        const raw = body[key];
        if (raw === undefined) {
            if (requireAll && !rule.optional) errors.push(rule.message);
            continue;
        }
        const value = String(raw).trim();
        if (rule.valid(value)) values[key] = value;
        else errors.push(rule.message);
    }

    for (const [key, label] of [["diningHalls", "Dining halls"], ["favoriteFoods", "Favorite foods"]]) {
        const list = parseList(body[key]);
        if (list === null) errors.push(`${label} must be a list of text values.`);
        else if (list !== undefined) values[key] = list;
    }

    return { values, errors };
}

// ---------- GET /users ----------
router.get("/", asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    res.json(result.rows.map(toApiUser));
}));

// ---------- GET /users/:id ----------
router.get("/:id", asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id." });

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found." });

    res.json(toApiUser(result.rows[0]));
}));

// ---------- POST /users ----------
router.post("/", upload.single("image"), asyncHandler(async (req, res) => {
    const { values, errors } = readFields(req.body ?? {}, { requireAll: true });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(" ") });

    const picture = req.file ? fileToDataUrl(req.file) : null;

    const result = await pool.query(
        `INSERT INTO users
            (first_name, last_name, email, major, graduation_year, bio,
            profile_picture_url, dining_halls, favorite_foods)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            values.firstName,
            values.lastName,
            values.email,
            values.major,
            Number(values.graduationYear),
            values.bio ?? "",
            picture,
            values.diningHalls ?? [],
            values.favoriteFoods ?? [],
        ]
    );

    res.status(201).json(toApiUser(result.rows[0]));
}));

// ---------- PUT /users/:id ----------
router.put("/:id", upload.single("image"), asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id. "});

    const body = req.body ?? {};
    const { values, errors } = readFields(body, { requireAll: false });
    if (errors.length > 0) return res.status(400).json({ error: errors.join(" ")});

    const removePicture = body.removeImage === "true" || body.removeImage === true;
    const pictureProvided = Boolean(req.file) || removePicture;
    const picture = req.file ? fileToDataUrl(req.file) : null;

    const result = await pool.query(
        `UPDATE users SET
            first_name          = COALESCE($1, first_name),
            last_name           = COALESCE($2, last_name),
            email               = COALESCE($3, email),
            major               = COALESCE($4, major),
            graduation_year     = COALESCE($5::integer, graduation_year),
            bio                 = COALESCE($6, bio),
            profile_picture_url = CASE WHEN $7::boolean THEN $8::text ELSE profile_picture_url END,
            dining_halls        = COALESCE($9::text[], dining_halls),
            favorite_foods      = COALESCE($10::text[], favorite_foods),
            updated_at          = NOW()
        WHERE id = $11
        RETURNING *`,
        [
            values.firstName ?? null,
            values.lastName ?? null,
            values.email ?? null,
            values.major ?? null,
            values.graduationYear ? Number(values.graduationYear) : null,
            values.bio ?? null,
            pictureProvided,
            picture,
            values.diningHalls ?? null,
            values.favoriteFoods ?? null,
            id,
        ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found." });
    res.json(toApiUser(result.rows[0]));
}));

// ---------- DELETE /users/:id ----------
router.delete("/:id", asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id." });

    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found." });

    res.status(204).end();
}));

// ---------- connections ----------
// GET /users/:id/connections: everyone this user has connected with
router.get("/:id/connections", asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid user id." });

    const result = await pool.query(
        `SELECT u.*
            FROM connections c
            JOIN users u ON u.id = c.connected_user_id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC`,
        [id]
    );
    res.json(result.rows.map(toApiUser));
}));

// POST /users/:id/connections with { "connectedUserId": 3 }
router.post("/:id/connections", asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const otherId = parseId(req.body?.connectedUserId);
    if (!id || !otherId) return res.status(400).json({ error: "Invalid user id." });

    await pool.query(
        `INSERT INTO connections (user_id, connected_user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING`,
        [id, otherId]
    );
    res.status(201).json({ userId: id, connectedUserId: otherId });
}));

// DELETE /users/:id/connections/:otherId
router.delete("/:id/connections/:otherId", asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const otherId = parseId(req.params.otherId);
    if (!id || !otherId) return res.status(400).json({ error: "Invalid user id." });

    await pool.query(
        "DELETE FROM connections WHERE user_id = $1 AND connected_user_id = $2",
        [id, otherId]
    );
    res.status(204).end();
}));

export default router;