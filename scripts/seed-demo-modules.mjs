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

  // --- Stage 4: progress history --------------------------------------------------------
  if (await isEmpty(db, "progress_updates")) {
    const series = [
      ["aarav", "Speech & language", ids.speech, [2, 2, 3, 3], ["Uses single words to request.", "Combining two words with prompts.", "Two-word phrases without prompts.", "Starting 3-word phrases at snack time."]],
      ["aarav", "Sensory processing", ids.speech, [2, 3, 3], ["Avoids messy play.", "Tolerates sand for 2 minutes.", "Joins sensory bin play willingly."]],
      ["zoya", "Social & emotional", ids.speech, [3, 3, 2], ["Waits for a turn with a visual cue.", "Shares toys with one peer.", "Upset by schedule changes this week."]],
      ["diya", "Fine motor", ids.ot, [2, 3, 4], ["Palmar grasp on crayons.", "Tripod grasp emerging.", "Threads 10 large beads independently."]],
      ["kabir", "Gross motor", ids.ot, [1, 2], ["Needs support climbing two steps.", "Climbs steps holding the rail."]],
    ];
    const rows = [];
    for (const [child, area, by, levels, notes] of series) {
      levels.forEach((level, i) => {
        const prev = levels[i - 1];
        const trend = prev === undefined ? "steady" : level > prev ? "improving" : level < prev ? "needs_attention" : "steady";
        rows.push({
          student_id: S[child], area, level, trend, record_date: day(-14 * (levels.length - 1 - i) - 1),
          observations: notes[i],
          improvements: trend === "improving" ? "Clear gain since the last review." : null,
          attention_areas: trend === "needs_attention" ? "Transitions between activities; prepare with a visual timetable." : null,
          recommendations: "Practise for 10 minutes daily at home.",
          shared_with_parent: true, created_by: by, updated_by: by,
        });
      });
    }
    await insert(db, "progress_updates", rows);
    console.log(`demo progress: ${rows.length} updates`);
  }

  // --- Stage 6: home assignments ------------------------------------------------------
  if (await isEmpty(db, "home_assignments")) {
    const tasks = await insert(db, "home_assignments", [
      { student_id: S.aarav, title: "Name 5 fruits at breakfast", instructions: "Show one fruit at a time and wait 5 seconds before helping.", assigned_on: day(-6), due_date: day(1), created_by: ids.speech, updated_by: ids.speech },
      { student_id: S.aarav, title: "Bubble blowing, 5 minutes", instructions: "Helps with breath control for speech.", assigned_on: day(-12), due_date: day(-5), created_by: ids.speech, updated_by: ids.speech },
      { student_id: S.diya, title: "Peg board practice", instructions: "10 pegs, pincer grasp only.", assigned_on: day(-9), due_date: day(-2), created_by: ids.ot, updated_by: ids.ot },
      { student_id: S.zoya, title: "Take turns in a board game", instructions: "Use the 'my turn / your turn' card.", assigned_on: day(-4), due_date: day(3), created_by: ids.speech, updated_by: ids.speech },
      { student_id: S.kabir, title: "Climb stairs holding the rail", instructions: "Twice a day, supervise closely.", assigned_on: day(-10), due_date: day(-3), created_by: ids.ot, updated_by: ids.ot },
    ]);
    // One completed and one reviewed, with a short conversation.
    await db.from("home_assignments").update({ status: "completed", completed_at: new Date().toISOString(), completed_by: ids.parentA }).eq("id", tasks[1].id);
    await db.from("home_assignments").update({ status: "completed", completed_at: new Date().toISOString(), completed_by: ids.parentA }).eq("id", tasks[2].id);
    await db.from("home_assignments").update({ status: "reviewed", staff_feedback: "Lovely progress, keep it up!", reviewed_by: ids.ot }).eq("id", tasks[2].id);
    await insert(db, "home_assignment_comments", [
      { assignment_id: tasks[1].id, student_id: S.aarav, author_id: ids.parentA, body: "He enjoyed it and lasted 4 minutes." },
      { assignment_id: tasks[2].id, student_id: S.diya, author_id: ids.parentA, body: "Done every day this week." },
      { assignment_id: tasks[2].id, student_id: S.diya, author_id: ids.ot, body: "Wonderful, thank you!" },
    ]);
    console.log(`demo home assignments: ${tasks.length}`);
  }

  // --- Stage 7: fees and payments -------------------------------------------------------
  if (await isEmpty(db, "fees")) {
    const month = (offset) => {
      const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + offset);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
    };
    const fees = await insert(db, "fees", [
      { student_id: S.aarav, title: `${month(-1)} therapy fee`, amount: 6000, discount: 0, due_date: day(-25), created_by: ids.admin },
      { student_id: S.aarav, title: `${month(0)} therapy fee`, amount: 6000, discount: 500, due_date: day(3), created_by: ids.admin },
      { student_id: S.diya, title: `${month(0)} therapy fee`, amount: 4500, discount: 0, due_date: day(-4), created_by: ids.admin },
      { student_id: S.zoya, title: `${month(0)} therapy fee`, amount: 7000, discount: 0, due_date: day(0), created_by: ids.admin },
      { student_id: S.kabir, title: "Initial assessment", amount: 2500, discount: 0, due_date: day(-20), created_by: ids.admin },
    ]);
    await insert(db, "payments", [
      { fee_id: fees[0].id, student_id: S.aarav, amount: 6000, payment_date: day(-27), method: "upi", reference: "UPI-48213", created_by: ids.admin },
      { fee_id: fees[2].id, student_id: S.diya, amount: 2000, payment_date: day(-6), method: "cash", remarks: "Rest next week", created_by: ids.admin },
      { fee_id: fees[4].id, student_id: S.kabir, amount: 2500, payment_date: day(-21), method: "bank_transfer", reference: "NEFT 77120", created_by: ids.admin },
    ]);
    console.log(`demo billing: ${fees.length} fees`);
  }
}
