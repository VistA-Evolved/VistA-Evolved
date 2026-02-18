/**
 * Complaint Pack: Headache
 * Covers primary headache differential, red flag features, migraine screening
 */
import type { IntakePack } from "../types.js";

const pack: IntakePack = {
  packId: "complaint-headache-v1",
  version: "1.0.0",
  title: "Headache Intake",
  description: "Focused headache history with red flag screening",
  languages: ["en"],
  applicableContexts: {
    departments: ["*"],
    specialties: ["*"],
    visitTypes: ["*"],
    chiefComplaints: ["headache", "migraine", "head pain", "cephalgia"],
  },
  requiredCoverage: ["hpi", "ros"],
  items: [
    { linkId: "ha-location", type: "choice", text: "Where is the headache?", section: "hpi", required: true, order: 30,
      answerOption: [
        { value: "frontal", display: "Forehead/front" },
        { value: "temporal", display: "Sides (temples)" },
        { value: "occipital", display: "Back of head" },
        { value: "unilateral", display: "One side only" },
        { value: "global", display: "Whole head" },
        { value: "behind_eye", display: "Behind the eye" },
      ] },
    { linkId: "ha-quality", type: "choice", text: "How does the headache feel?", section: "hpi", required: true, order: 31,
      answerOption: [
        { value: "throbbing", display: "Throbbing/pulsating" },
        { value: "pressure", display: "Pressure/band-like" },
        { value: "sharp", display: "Sharp/stabbing" },
        { value: "dull", display: "Dull ache" },
      ] },
    { linkId: "ha-onset-type", type: "choice", text: "How did this headache start?", section: "hpi", required: true, order: 32,
      answerOption: [
        { value: "sudden", display: "Thunderclap (worst headache of my life, came on in seconds)" },
        { value: "rapid", display: "Came on quickly (minutes)" },
        { value: "gradual", display: "Built up slowly (hours)" },
      ] },
    { linkId: "ha-thunderclap", type: "display", text: "IMPORTANT: A sudden, severe headache that comes on in seconds needs immediate evaluation. Please inform staff immediately.", section: "hpi", required: false, order: 33,
      enableWhen: [{ question: "ha-onset-type", operator: "=", answer: "sudden" }],
      redFlag: { condition: "ha-onset-type=sudden", message: "Thunderclap headache - rule out SAH", severity: "critical" } },
    { linkId: "ha-worst-ever", type: "boolean", text: "Is this the worst headache of your life?", section: "hpi", required: true, order: 34,
      redFlag: { condition: "true", message: "Worst headache ever - SAH/meningitis concern", severity: "critical" } },
    { linkId: "ha-frequency", type: "choice", text: "How often do you get headaches?", section: "hpi", required: true, order: 35,
      answerOption: [
        { value: "first", display: "This is a new/first headache" },
        { value: "occasional", display: "A few times a year" },
        { value: "monthly", display: "A few times a month" },
        { value: "weekly", display: "Several times a week" },
        { value: "daily", display: "Daily or near-daily" },
      ] },
    { linkId: "ha-aura", type: "boolean", text: "Do you see flashing lights, zigzag lines, or have vision changes before the headache?", section: "hpi", required: true, order: 36 },
    { linkId: "ha-photophobia", type: "boolean", text: "Does light bother you during the headache?", section: "ros", required: true, order: 40 },
    { linkId: "ha-phonophobia", type: "boolean", text: "Does noise bother you during the headache?", section: "ros", required: true, order: 41 },
    { linkId: "ha-nausea", type: "boolean", text: "Do you feel nauseous or vomit with the headache?", section: "ros", required: true, order: 42 },
    { linkId: "ha-neck-stiffness", type: "boolean", text: "Do you have neck stiffness?", section: "ros", required: true, order: 43,
      redFlag: { condition: "true", message: "Neck stiffness with headache - meningitis concern", severity: "high" } },
    { linkId: "ha-fever", type: "boolean", text: "Do you have a fever?", section: "ros", required: true, order: 44,
      redFlag: { condition: "true", message: "Fever with headache - infection concern", severity: "high" } },
    { linkId: "ha-vision-change", type: "boolean", text: "Any new vision changes (blurry, double vision, loss of vision)?", section: "ros", required: true, order: 45,
      redFlag: { condition: "true", message: "Vision changes with headache - ICP/mass/GCA concern", severity: "high" } },
    { linkId: "ha-weakness", type: "boolean", text: "Any new weakness, numbness, or difficulty speaking?", section: "ros", required: true, order: 46,
      redFlag: { condition: "true", message: "Focal neuro deficits - stroke/mass concern", severity: "critical" } },
    { linkId: "ha-triggers", type: "open-choice", text: "What triggers or worsens the headache?", section: "hpi", required: false, order: 37,
      answerOption: [
        { value: "stress", display: "Stress" },
        { value: "sleep", display: "Lack of sleep" },
        { value: "food", display: "Certain foods" },
        { value: "weather", display: "Weather changes" },
        { value: "exertion", display: "Physical activity" },
        { value: "cough", display: "Coughing/straining" },
      ] },
  ],
  complaintClusters: ["headache", "neurological"],
  specialtyTags: ["neurology", "primary_care"],
  departmentTags: [],
  priority: 10,
  outputTemplates: {
    hpiTemplate: "Headache: {{ha-quality}}, {{ha-location}}. Onset: {{ha-onset-type}}. Frequency: {{ha-frequency}}. Aura: {{ha-aura}}. Triggers: {{ha-triggers}}.",
    rosTemplate: "NEURO: Photophobia {{ha-photophobia}}, phonophobia {{ha-phonophobia}}, vision changes {{ha-vision-change}}, focal deficits {{ha-weakness}}. GI: Nausea {{ha-nausea}}. MSK: Neck stiffness {{ha-neck-stiffness}}. GENERAL: Fever {{ha-fever}}.",
    noteTemplate: "",
  },
  scoringThresholds: [],
};

export default pack;
