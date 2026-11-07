import { readFileSync } from "node:fs";
import pool from "./db.js";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

try {
    await pool.query(sql);
    console.log("Tables are ready.");
} catch (err) {
    console.error("Setup failed:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}