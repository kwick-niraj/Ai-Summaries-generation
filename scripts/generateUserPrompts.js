function generateUserPrompt(meta, summaryToneAndStructure, isFirstHalf = true) {
  const {
    title,
    author,
    publication_date,
    genre = [],
    target_audience = [],
    "core_themes": CoreThemes = [],
    "key_concepts_lessons": KeyConcepts = [],
    "primary_purpose": PrimaryPurpose = '',
    "structure_format": StructureFormat = {},
    "style_tone": StyleTone = [],
    "notable_features": NotableFeatures = []
  } = meta;

  // 🧱 Structure
  let structureLine = "7–9 narrative-driven thematic sections.";
  if (StructureFormat?.Organization?.toLowerCase().includes("chapter") || StructureFormat?.Organization?.toLowerCase().includes("tip")) {
    structureLine += " Group related chapters, tips, or ideas into cohesive themes.";
  }
  structureLine += " Include a short Introduction (~800–1000 characters). Include a Conclusion (~800–1000 characters).";

  // 🧱 Tone
  // const metaTone = StyleTone.length > 0 ? StyleTone.join(', ') : "natural, clear, and accessible";
  const toneAndStructure = summaryToneAndStructure;

  // const tone = `story_wisdom, tactical_breakdown, ${metaTone}`
  // const tone = metaTone;


  // 🧱 Bullet rules
  const bulletRule = "sparingly for summarizing grouped tools, techniques, or insights — not for every section";

  // 🧱 Summary Strategy (flexible, genre-agnostic)
  // const summaryStrategy = `Summary Type: ${toneAndStructure.structure_type}.\nDescription: ${toneAndStructure.description} ${toneAndStructure.structure}`;

  const summaryStrategy = `
  {
  
  "structure_type": "story_wisdom",
  "description": "Use the following structure configuration to guide the summary writing process.\n\n• The summary should follow the **story_wisdom** structure — Build the summary around emotionally engaging, narrative-style writing that reflects the entrepreneurial insights and mindset shifts presented in *The Millionaire Fastlane*. Maintain the original chapter flow for at least 80% of the structure. Paraphrase the stories, analogies, and thought experiments provided by the author to convey their lessons naturally.\n\nUse a hybrid tone across the summary that seamlessly blends narrative, reflection, and applied insight in the following way:\n\n1. Begin each chapter with a **compelling, real-world setup** that introduces the theme using reflective, human-centered language. Avoid generalities—ground the idea in emotional relevance or common life situations that echo the book's themes of dissatisfaction, financial pressure, or restless ambition.\n\n2. When referencing examples, analogies, or illustrative concepts (like the 'slowlane' and 'fastlane'), use **immersive storytelling** to bring them to life. Describe scenarios through paraphrased experiences using unnamed, relatable characters. Focus on emotional realism and mental turning points. Keep scenes grounded, concise, and avoid exaggerated dramatization.\n\n3. Throughout the narration, **weave in core lessons through a natural conversational tone**. Speak to the reader as if offering clarity in the moment. Avoid labeling lessons or listing takeaways directly. Instead, embed them through reflection, cause-effect realization, or subtle shifts in perspective. The insight should feel earned by the reader, not presented as a bullet point.\n\nMaintain a tone that is direct, motivational, and thought-provoking — consistent with DeMarco’s no-nonsense voice, but softened for smooth narrative flow. Avoid formal structure, instructional headings, or repetitive phrasing. Let the writing feel like a persuasive conversation backed by personal reflection and entrepreneurial storytelling."

}

`
// • 5% of the summary should follow the **“tactical_breakdown”** structure — Structure the summary as a clear, practical walkthrough of the book’s strategies. Each chapter should cover a core idea or principle and explain how it works in real-life situations. Write in a clear, third-person, instructional tone. While the summary itself should flow in paragraphs, any actionable steps, techniques, or tools mentioned within a chapter should be listed using bullet points for clarity. Avoid second-person language (“you”), and use general, relatable examples to ground the advice. Keep the language simple, direct, and helpful.

// Avoid treating the styles as separate sections. Let them blend naturally within each chapter.

  // 🧱 Avoid list (dynamic + generic)
  const avoid = [
    "Using words like (e.g., 'you', 'your')",
    `Mentioning the author directly (e.g., '${author} says...', '${author} believes...')`,
    "Overuse of bullet points or generic list formatting",
    "Reusing original chapter titles from the book",
    "Copying or closely imitating the book’s own phrasing or section names",
    "Jargon or complex vocabulary",
    "over-fictionalizing or introducing narrative embellishments that misrepresent real events or teachings. When describing characters (e.g., mentors, parents, friends), refer to their roles based on how they function in the author’s life, not how they could be dramatized."
  ];


  return `
You are a professional nonfiction book summarizer.

Your job is to generate a natural, flowing, clear, engaging and deeply paraphrased summary of the following nonfiction book using the metadata and the formatting rules provided.

⸻

📘 Book Metadata:
• Title: ${title}
• Author: ${author}
• Genre: ${genre.join(', ')}
• First Published: ${publication_date}
• Target Audience: ${target_audience.join(', ')}

🎯 Primary Purpose:
${PrimaryPurpose}

🔑 Core Themes:
${CoreThemes.join(', ')}

🧠 Key Concepts:
${KeyConcepts.join(', ')}

📐 Structure:
${structureLine}

📝 Summary Strategy:
${summaryStrategy}

🎯 Writing Guidelines:
• Voice: Use a combination of second-person and  third-person voice
• Bullet Points: ${bulletRule}
• Target Length: 22,000–25,000 characters

🚫 Avoid:
• ${avoid.join('\n• ')}

⚠️ Additional Instructions:
• Create concise, simple, and clear section titles. Each title should describe the core theme of the section using plain language (10-15 words max). Avoid poetic phrases, vague abstractions, or metaphors.
• Paraphrase deeply — no direct quotes
• Use metadata to guide summary focus, tone, and order — do not invent structure
• Ensure smooth transitions between sections and avoid isolated blocks
•	Preserve the 80% logical flow of concepts as in the original book.
•	Maintain factual alignment with the book’s original structure and narrative. Do not invent or exaggerate relationships, story setups, or character roles.s

You are generating the ${isFirstHalf ? 'first' : 'second'} half of a complete longform summary. The half summary will be approximately 22,000–25,000 characters across 4-5 chapters.

In this half, include only 4–5 chapters, adjusted to match the same level of depth, detail, and character count as you would in a full-length summary. Do not shorten content — only reduce the number of chapters. The tone, structure, and pacing must remain consistent.

Wait for or build upon the other half accordingly.
`.trim();
}

module.exports = {
  generateUserPrompt,
}