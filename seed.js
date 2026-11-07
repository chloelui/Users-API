import pool from "./db.js";

const students = [
  { first: "Alex", last: "Rivera", major: "Biology", year: 2029, halls: ["Elder Hall", "Buen Día"], foods: ["Ramen", "Dumplings"], bio: "Lives for ramen nights and trying new spots." },
  { first: "Priya", last: "Shah", major: "Economics", year: 2028, halls: ["Sargent Hall", "Noriteo Chicken & Boba"], foods: ["Curry", "Pho"], bio: "Always down for boba between classes." },
  { first: "Marcus", last: "Lee", major: "Engineering", year: 2030, halls: ["Allison Hall", "Café Coralie"], foods: ["Pizza", "Wings"], bio: "Will trade a pizza slice for a study buddy." },
  { first: "Sofia", last: "Reyes", major: "Journalism", year: 2027, halls: ["Forno Pizza Co."], foods: ["Burritos", "Wings"], bio: "Writing about campus food one burrito at a time." },
  { first: "Jordan", last: "Kim", major: "Psychology", year: 2029, halls: ["Plex East Hall"], foods: ["Ramen", "Smoothies"], bio: "Smoothie after every workout." },
  { first: "Emma", last: "Walker", major: "Chemistry", year: 2028, halls: ["Shake Smart", "Café Bergson"], foods: ["Salads", "Bagels"], bio: "Bagel connoisseur and lab partner." },
  { first: "Tyrone", last: "Brooks", major: "Business", year: 2030, halls: ["Plex West Hall", "847 Burger"], foods: ["Burgers", "Pho"], bio: "Rating every burger on campus." },
  { first: "Hana", last: "Sato", major: "Public Health", year: 2027, halls: ["Starbucks"], foods: ["Ramen", "Smoothies"], bio: "Grad student fueled by coffee and noodles." },
  { first: "Noah", last: "Patel", major: "Math", year: 2029, halls: ["Wildcat Deli", "Fran's Café"], foods: ["Pizza", "Burgers"], bio: "Counting calories? No, counting sandwiches." },
  { first: "Lily", last: "Chen", major: "Art", year: 2028, halls: ["Luna's Pub & Grill"], foods: ["Bagels", "Salads"], bio: "Sketching meals before I eat them." },
  { first: "Diego", last: "Torres", major: "Nursing", year: 2027, halls: ["Tech Express", "Protein Bar & Kitchen"], foods: ["Burritos", "Ramen"], bio: "Post-clinical burrito runs are a tradition." },
  { first: "Aisha", last: "Khan", major: "Biology", year: 2030, halls: ["Elder Hall", "Lisa's Café"], foods: ["Curry", "Pho"], bio: "Looking for people to split a curry with." },
];

try {
    for (const s of students) {
        const email = `${s.first}${s.last}${s.year}@u.northwestern.edu`.toLowerCase();
        await pool.query(
            `INSERT INTO users (first_name, last_name, email, major, graduation_year, bio, dining_halls, favorite_foods)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO NOTHING`,
            [s.first, s.last, email, s.major, s.year, s.bio, s.halls, s.foods]
        );
    }
    console.log(`Seeded ${students.length} students.`);
} catch (err) {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}