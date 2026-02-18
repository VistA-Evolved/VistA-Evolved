/**
 * Complaint Packs: Anxiety, Depression (with validated screening instruments)
 * Includes PHQ-2, GAD-2, and AUDIT-C scoring thresholds
 */
import type { IntakePack } from "../types.js";

export const anxietyPack: IntakePack = {
  packId: "complaint-anxiety-v1", version: "1.0.0",
  title: "Anxiety Intake", description: "Focused anxiety history with GAD-2 screening",
  languages: ["en"],
  applicableContexts: { departments: ["*"], specialties: ["*"], visitTypes: ["*"], chiefComplaints: ["anxiety", "anxious", "panic", "panic attack", "worry", "nervousness", "nervous"] },
  requiredCoverage: ["hpi", "ros", "screening"],
  items: [
    // GAD-2 screening
    { linkId: "anx-gad2-nervous", type: "choice", text: "Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?", section: "screening", required: true, order: 30,
      scoring: { instrument: "GAD-2", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Not at all" }, { value: "1", display: "Several days" }, { value: "2", display: "More than half the days" }, { value: "3", display: "Nearly every day" }] },
    { linkId: "anx-gad2-worry", type: "choice", text: "Over the last 2 weeks, how often have you been unable to stop or control worrying?", section: "screening", required: true, order: 31,
      scoring: { instrument: "GAD-2", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Not at all" }, { value: "1", display: "Several days" }, { value: "2", display: "More than half the days" }, { value: "3", display: "Nearly every day" }] },
    // HPI
    { linkId: "anx-duration", type: "choice", text: "How long have you been feeling this way?", section: "hpi", required: true, order: 35, answerOption: [{ value: "days", display: "Days" }, { value: "weeks", display: "Weeks" }, { value: "months", display: "Months" }, { value: "years", display: "Years" }] },
    { linkId: "anx-trigger", type: "string", text: "Is there something specific causing your anxiety (optional)?", section: "hpi", required: false, order: 36 },
    { linkId: "anx-panic-attacks", type: "boolean", text: "Do you have sudden episodes of intense fear (panic attacks)?", section: "hpi", required: true, order: 37 },
    { linkId: "anx-avoidance", type: "boolean", text: "Are you avoiding places or situations because of anxiety?", section: "hpi", required: true, order: 38 },
    // ROS
    { linkId: "anx-sleep", type: "boolean", text: "Difficulty sleeping due to anxiety?", section: "ros", required: true, order: 40 },
    { linkId: "anx-concentration", type: "boolean", text: "Difficulty concentrating?", section: "ros", required: true, order: 41 },
    { linkId: "anx-physical", type: "open-choice", text: "Physical symptoms with anxiety?", section: "ros", required: true, order: 42, answerOption: [{ value: "palpitations", display: "Heart racing" }, { value: "tremor", display: "Shaking/trembling" }, { value: "sob", display: "Shortness of breath" }, { value: "gi", display: "Stomach upset" }, { value: "sweating", display: "Sweating" }, { value: "none", display: "None" }] },
    // Safety
    { linkId: "anx-si", type: "boolean", text: "Have you had any thoughts of harming yourself?", section: "screening", required: true, order: 50,
      redFlag: { condition: "true", message: "SUICIDAL IDEATION - immediate safety assessment required", severity: "critical" } },
    { linkId: "anx-substances", type: "boolean", text: "Are you using alcohol or drugs to cope with anxiety?", section: "screening", required: true, order: 51 },
  ],
  complaintClusters: ["anxiety", "behavioral_health"], specialtyTags: ["behavioral_health", "psychiatry"], departmentTags: [], priority: 10,
  outputTemplates: { hpiTemplate: "Anxiety: duration {{anx-duration}}. Panic attacks: {{anx-panic-attacks}}. Avoidance: {{anx-avoidance}}.", rosTemplate: "PSYCH: Sleep {{anx-sleep}}, concentration {{anx-concentration}}. Physical: {{anx-physical}}. SI: {{anx-si}}. Substance use: {{anx-substances}}.", noteTemplate: "GAD-2: Nervous {{anx-gad2-nervous}}/3, Worry {{anx-gad2-worry}}/3." },
  scoringThresholds: [{ instrument: "GAD-2", cutoff: 3, action: "flag_for_review", message: "GAD-2 score >= 3 suggests clinically significant anxiety" }],
};

export const depressionPack: IntakePack = {
  packId: "complaint-depression-v1", version: "1.0.0",
  title: "Depression Intake", description: "Focused depression history with PHQ-2 screening",
  languages: ["en"],
  applicableContexts: { departments: ["*"], specialties: ["*"], visitTypes: ["*"], chiefComplaints: ["depression", "depressed", "sad", "hopelessness", "low mood", "feel down"] },
  requiredCoverage: ["hpi", "ros", "screening"],
  items: [
    // PHQ-2 screening
    { linkId: "dep-phq2-interest", type: "choice", text: "Over the last 2 weeks, how often have you had little interest or pleasure in doing things?", section: "screening", required: true, order: 30,
      scoring: { instrument: "PHQ-2", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Not at all" }, { value: "1", display: "Several days" }, { value: "2", display: "More than half the days" }, { value: "3", display: "Nearly every day" }] },
    { linkId: "dep-phq2-depressed", type: "choice", text: "Over the last 2 weeks, how often have you been feeling down, depressed, or hopeless?", section: "screening", required: true, order: 31,
      scoring: { instrument: "PHQ-2", itemWeight: 1 },
      answerOption: [{ value: "0", display: "Not at all" }, { value: "1", display: "Several days" }, { value: "2", display: "More than half the days" }, { value: "3", display: "Nearly every day" }] },
    // HPI
    { linkId: "dep-duration", type: "choice", text: "How long have you been feeling this way?", section: "hpi", required: true, order: 35, answerOption: [{ value: "days", display: "Days" }, { value: "weeks", display: "Weeks" }, { value: "months", display: "Months" }, { value: "years", display: "Years" }] },
    { linkId: "dep-trigger", type: "string", text: "Has anything happened recently that may have contributed (optional)?", section: "hpi", required: false, order: 36 },
    { linkId: "dep-sleep", type: "choice", text: "How is your sleep?", section: "ros", required: true, order: 40, answerOption: [{ value: "normal", display: "Normal" }, { value: "insomnia", display: "Can't sleep" }, { value: "hypersomnia", display: "Sleeping too much" }, { value: "early_waking", display: "Waking up too early" }] },
    { linkId: "dep-appetite", type: "choice", text: "How is your appetite?", section: "ros", required: true, order: 41, answerOption: [{ value: "normal", display: "Normal" }, { value: "decreased", display: "Decreased" }, { value: "increased", display: "Increased" }] },
    { linkId: "dep-energy", type: "boolean", text: "Fatigue or loss of energy?", section: "ros", required: true, order: 42 },
    { linkId: "dep-concentration", type: "boolean", text: "Difficulty concentrating or making decisions?", section: "ros", required: true, order: 43 },
    { linkId: "dep-guilt", type: "boolean", text: "Feelings of worthlessness or excessive guilt?", section: "ros", required: true, order: 44 },
    // Safety - CRITICAL
    { linkId: "dep-si", type: "boolean", text: "Have you had thoughts of harming yourself or ending your life?", section: "screening", required: true, order: 50,
      redFlag: { condition: "true", message: "SUICIDAL IDEATION - immediate safety assessment required", severity: "critical" } },
    { linkId: "dep-si-plan", type: "boolean", text: "Do you have a plan to act on these thoughts?", section: "screening", required: false, order: 51,
      enableWhen: [{ question: "dep-si", operator: "=", answer: true }],
      redFlag: { condition: "true", message: "SUICIDAL IDEATION WITH PLAN - immediate intervention required", severity: "critical" } },
    { linkId: "dep-substances", type: "boolean", text: "Are you using alcohol or drugs to cope?", section: "screening", required: true, order: 52 },
  ],
  complaintClusters: ["depression", "behavioral_health"], specialtyTags: ["behavioral_health", "psychiatry"], departmentTags: [], priority: 10,
  outputTemplates: { hpiTemplate: "Depression: duration {{dep-duration}}.", rosTemplate: "PSYCH: Sleep {{dep-sleep}}, appetite {{dep-appetite}}, energy {{dep-energy}}, concentration {{dep-concentration}}, guilt {{dep-guilt}}. SI: {{dep-si}}. Substance use: {{dep-substances}}.", noteTemplate: "PHQ-2: Interest {{dep-phq2-interest}}/3, Depressed {{dep-phq2-depressed}}/3." },
  scoringThresholds: [{ instrument: "PHQ-2", cutoff: 3, action: "flag_for_review", message: "PHQ-2 score >= 3 suggests clinically significant depression" }],
};
