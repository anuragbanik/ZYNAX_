import type { CampusDoc } from "./types";

/** Fictional demo college document. Not a real institution. */
export const SAMPLE_DOC_ID = "sample-northbridge-physics";

export function sampleSyllabus(): CampusDoc {
  const pages = [
    {
      page: 1,
      text: "NORTHBRIDGE INSTITUTE OF TECHNOLOGY — FICTIONAL SAMPLE SYLLABUS. This document is invented for demonstration and is not an official college notice. Course: PHY-204 Applied Physics. Semester 3, Department of Computer Science. Instructor: Dr. Meera Lal (sample). Attendance rule in this sample handbook: students need 75 percent attendance to sit the end-semester exam. Library hours in this sample: weekdays 9:00 to 20:00.",
    },
    {
      page: 2,
      text: "Unit 1 — Measurement and Errors. Topics: units and dimensions, significant figures, types of errors, least count. Weightage: 15 percent. No numerical deadline is attached to Unit 1 in this sample.",
    },
    {
      page: 3,
      text: "Unit 2 — Waves and Oscillations. Topics included: simple harmonic motion, damped and forced oscillations, resonance, superposition, beats, standing waves on a string, Doppler effect (conceptual). Learning outcomes: derive the period of a spring-mass system, explain resonance with one everyday example, distinguish transverse and longitudinal waves. Suggested problems: Halliday sample set 15.1 to 15.8 (fictional reference inside this sample only). Weightage: 25 percent of the internal assessment.",
    },
    {
      page: 4,
      text: "Unit 3 — Electrostatics. Topics: Coulomb law, electric field, Gauss law applications, capacitors in series and parallel. Unit 4 — Modern Physics snapshot: photoelectric effect, work function, de Broglie wavelength. These units are not Unit 2.",
    },
    {
      page: 5,
      text: "Sample academic calendar (fictional, verify before relying on it). Mid-semester test for PHY-204: 12 November 2026, 10:00, Hall B. Assignment 1 (Unit 2 problem sheet) due: 28 October 2026, 17:00, submit on the sample portal. End-semester theory exam window listed in this sample: 8 to 20 December 2026. These dates exist only inside this demonstration document.",
    },
  ];
  return {
    id: SAMPLE_DOC_ID,
    name: "Sample — PHY-204 Applied Physics syllabus (fictional).pdf",
    size: 42000,
    uploadedAt: Date.now(),
    pages,
    kind: "sample",
    warning: "Fictional sample for the demo. Not an official college document.",
  };
}
