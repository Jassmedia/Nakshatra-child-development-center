// Demo records for each module (activities, attendance, progress, ...). Local development only.
// Each section checks its own table and skips if it already has rows.

const day = (offset) => {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000); // IST calendar day
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const isSunday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;

async function isEmpty(db, table) {
  const { count } = await db.from(table).select("id", { count: "exact", head: true });
  return !count;
}

async function insert(db, table, rows) {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

export async function seed(db, ids) {
  const { data: students } = await db.from("students").select("id, full_name");
  const S = Object.fromEntries((students ?? []).map((s) => [s.full_name.split(" ")[0].toLowerCase(), s.id]));
  if (!S.aarav) return;

  // --- Stage 3: catalogue, activities, attendance ---------------------------------
  if (await isEmpty(db, "activities")) {
    const catalogue = await insert(db, "activities", [
      { name: "Picture naming", kind: "activity", category: "Speech & language", default_duration_min: 20, description: "Show picture cards; child names each object." },
      { name: "Turn-taking game", kind: "activity", category: "Social & play", default_duration_min: 15 },
      { name: "Bead threading", kind: "activity", category: "Occupational therapy", default_duration_min: 15 },
      { name: "Sensory bin exploration", kind: "activity", category: "Sensory", default_duration_min: 20 },
      { name: "Obstacle course", kind: "workout", category: "Physiotherapy / motor", default_duration_min: 20 },
      { name: "Animal walks", kind: "workout", category: "Physiotherapy / motor", default_duration_min: 10 },
      { name: "Trampoline jumps", kind: "workout", category: "Sensory", default_duration_min: 10 },
    ]);
    const C = Object.fromEntries(catalogue.map((c) => [c.name, c]));

    const plan = {
      aarav: [["Picture naming", "10:00", ids.speech], ["Trampoline jumps", "10:30", ids.speech]],
      zoya: [["Turn-taking game", "11:00", ids.speech], ["Picture naming", "11:30", ids.speech]],
      diya: [["Bead threading", "10:00", ids.ot], ["Obstacle course", "10:20", ids.ot]],
      kabir: [["Sensory bin exploration", "12:00", ids.ot], ["Animal walks", "12:30", ids.ot]],
    };
    const remarks = [
      "Good focus today; needed two prompts to start.",
      "Completed independently and asked for more.",
      "Tired after lunch; did half the set.",
      "Clear progress compared with last week.",
    ];
    const rows = [];
    for (let offset = -14; offset <= 3; offset++) {
      const date = day(offset);
      if (isSunday(date)) continue;
      for (const [child, items] of Object.entries(plan)) {
        for (const [name, time, by] of items) {
          const c = C[name];
          const past = offset < 0;
          const r = (offset + 20 + name.length) % 10;
          const status = !past ? "scheduled" : r < 6 ? "completed" : r < 8 ? "partially_completed" : r < 9 ? "not_completed" : "cancelled";
          rows.push({
            student_id: S[child], activity_id: c.id, title: c.name, kind: c.kind, category: c.category,
            scheduled_date: date, scheduled_time: time, duration_min: c.default_duration_min,
            status, performance_rating: past && status !== "cancelled" ? 1 + (r % 5) : null,
            staff_remarks: past && status !== "cancelled" ? remarks[r % remarks.length] : null,
            created_by: by, updated_by: by,
          });
        }
      }
    }
    await insert(db, "student_activities", rows);
    console.log(`demo activities: ${catalogue.length} in catalogue, ${rows.length} scheduled`);
  }

  if (await isEmpty(db, "attendance")) {
    const rows = [];
    for (let offset = -21; offset <= -1; offset++) {
      const date = day(offset);
      if (isSunday(date)) continue;
      for (const child of ["aarav", "diya", "zoya", "kabir"]) {
        const r = (offset * 7 + child.length * 3 + 100) % 12;
        const status = r === 0 ? "absent" : r === 1 ? "leave" : r === 2 ? "late" : "present";
        rows.push({
          student_id: S[child], attendance_date: date, status,
          check_in: status === "present" ? "09:30" : status === "late" ? "10:15" : null,
          check_out: status === "present" || status === "late" ? "13:00" : null,
          remarks: status === "absent" ? "Fever, informed by parent" : status === "leave" ? "Family function" : null,
        });
      }
    }
    await insert(db, "attendance", rows);
    console.log(`demo attendance: ${rows.length} rows`);
  }
}
