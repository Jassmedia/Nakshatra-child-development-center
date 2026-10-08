// Fictional demo records for local development. Called by seed-demo.mjs. Idempotent: skips if students exist.
// Every name here is invented.

const iso = (d) => d.toISOString().slice(0, 10);
const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return iso(d);
};

export async function seed(db, ids) {
  const { count } = await db.from("students").select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log("demo students already present, skipping data seed");
    return;
  }

  const insert = async (table, rows) => {
    const { data, error } = await db.from(table).insert(rows).select();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data;
  };

  // --- Students ---------------------------------------------------------------
  const students = await insert("students", [
    { admission_number: "", full_name: "Aarav Sharma", date_of_birth: "2020-03-14", gender: "male", enrollment_date: day(-120), diagnosis: "Speech delay; mild sensory processing difficulties", medical_notes: "Allergic to peanuts.", school_name: "Little Steps Preschool", blood_group: "B+" },
    { admission_number: "", full_name: "Diya Sharma", date_of_birth: "2018-11-02", gender: "female", enrollment_date: day(-90), diagnosis: "Fine motor delay", school_name: "Green Valley School" },
    { admission_number: "", full_name: "Zoya Khan", date_of_birth: "2019-07-21", gender: "female", enrollment_date: day(-60), diagnosis: "Autism spectrum (level 1); social communication goals", medical_notes: "Uses noise-cancelling headphones in loud rooms." },
    { admission_number: "", full_name: "Kabir Nair", date_of_birth: "2021-01-30", gender: "male", enrollment_date: day(-30), diagnosis: "Global developmental delay" },
  ]);
  const [aarav, diya, zoya, kabir] = students;

  // --- Parents --------------------------------------------------------------------
  const parents = await insert("parents", [
    { full_name: "Priya Sharma", phone: "+91 98450 20001", email: "priya@nakshatra.test", profile_id: ids.parentA, address: "12 MG Road, Bengaluru" },
    { full_name: "Vikram Sharma", phone: "+91 98450 20011" },
    { full_name: "Imran Khan", phone: "+91 98450 20002", email: "imran@nakshatra.test", profile_id: ids.parentB },
    { full_name: "Lakshmi Nair", phone: "+91 98450 20003", email: "lakshmi@nakshatra.test" },
  ]);
  const [priya, vikram, imran, lakshmi] = parents;

  await insert("student_parents", [
    { student_id: aarav.id, parent_id: priya.id, relationship: "mother", is_primary_contact: true },
    { student_id: aarav.id, parent_id: vikram.id, relationship: "father", is_primary_contact: false },
    { student_id: diya.id, parent_id: priya.id, relationship: "mother", is_primary_contact: true },
    { student_id: zoya.id, parent_id: imran.id, relationship: "father", is_primary_contact: true },
    { student_id: kabir.id, parent_id: lakshmi.id, relationship: "mother", is_primary_contact: true },
  ]);

  // --- Therapist assignments --------------------------------------------------------
  await insert("student_staff_assignments", [
    { student_id: aarav.id, staff_id: ids.speech, assignment_role: "Primary therapist", starts_on: day(-110), assigned_by: ids.admin },
    { student_id: zoya.id, staff_id: ids.speech, assignment_role: "Speech sessions", starts_on: day(-55), assigned_by: ids.admin },
    { student_id: diya.id, staff_id: ids.ot, assignment_role: "Primary therapist", starts_on: day(-85), assigned_by: ids.admin },
    { student_id: kabir.id, staff_id: ids.ot, assignment_role: "Primary therapist", starts_on: day(-28), assigned_by: ids.admin },
    { student_id: aarav.id, staff_id: ids.ot, assignment_role: "Sensory sessions", starts_on: day(-100), ends_on: day(-40), assigned_by: ids.admin },
  ]);

  console.log("demo students, parents and assignments created");

  // Later stages append their demo data via this hook.
  const more = await import("./seed-demo-modules.mjs").catch(() => null);
  if (more?.seed) await more.seed(db, ids, { aarav, diya, zoya, kabir }, { day, insert });
}
