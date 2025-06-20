import { VoiceSelectionProvider } from './VoiceSelectionProvider.js';

/**
 * Rule-based voice selection provider (fallback)
 */
export class RuleBasedVoiceSelector extends VoiceSelectionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'rule-based';
    
    // Genre to voice category mapping
    this.genreMapping = {
      'personal finance': ['business', 'professional'],
      'self-help': ['self-help', 'personal-development'],
      'entrepreneurship': ['business', 'leadership'],
      'business': ['business', 'professional', 'corporate'],
      'leadership': ['leadership', 'professional'],
      'motivation': ['motivational', 'inspirational'],
      'wellness': ['wellness', 'mindfulness'],
      'spirituality': ['spiritual', 'wellness'],
      'technology': ['technology', 'innovation'],
      'science': ['science', 'technology'],
      'philosophy': ['philosophy', 'intellectual'],
      'biography': ['biography', 'narrative'],
      'history': ['history', 'authoritative'],
      'psychology': ['academic', 'professional'],
      'health': ['wellness', 'healing'],
      'fitness': ['motivational', 'wellness'],
      'relationships': ['self-help', 'personal-development'],
      'parenting': ['general-audience', 'accessible'],
      'education': ['educational', 'accessible'],
      'creativity': ['creative', 'inspirational'],
      'memoir': ['narrative', 'storytelling']
    };
  }

  /**
   * Rule-based provider is always available
   * @returns {Promise<boolean>} Always true
   */
  async isAvailable() {
    return true;
  }

  /**
   * Select optimal voice using rule-based logic
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    try {
      console.log(`📋 Using rule-based voice selection: "${metadata.title}"`);
      
      const analysis = this.analyzeBookCharacteristics(metadata);
      const selectedVoice = this.selectOptimalVoice(analysis);
      
      return this.formatResult(
        selectedVoice.name,
        metadata,
        selectedVoice.confidence,
        selectedVoice.reasoning
      );

    } catch (error) {
      console.error('Rule-based voice selection failed:', error);
      // Ultimate fallback
      return this.formatResult('nova', metadata, 60, 'Ultimate fallback selection');
    }
  }

  /**
   * Analyze book characteristics for voice selection
   * @param {Object} metadata - Book metadata
   * @returns {Object} Analysis result
   */
  analyzeBookCharacteristics(metadata) {
    const analysis = {
      authorGender: this.inferAuthorGender(metadata.author),
      genres: this.normalizeGenres(metadata.genre || []),
      themes: metadata.core_themes || [],
      targetAudience: metadata.target_audience || [],
      tone: this.inferBookTone(metadata),
      authorityLevel: this.inferAuthorityLevel(metadata),
      contentStyle: this.inferContentStyle(metadata)
    };

    return analysis;
  }

  /**
   * Select optimal voice based on analysis
   * @param {Object} analysis - Book analysis
   * @returns {Object} Selected voice with confidence and reasoning
   */
  selectOptimalVoice(analysis) {
    const voices = this.getVoiceCharacteristics();
    const candidates = [];

    // Score each voice based on analysis
    for (const [voiceName, voiceData] of Object.entries(voices)) {
      const score = this.calculateVoiceScore(voiceData, analysis);
      candidates.push({
        name: voiceName,
        characteristics: voiceData,
        score: score.total,
        reasoning: score.reasoning
      });
    }

    // Sort by score and select the best match
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];

    return {
      name: selected.name,
      characteristics: selected.characteristics,
      confidence: Math.min(95, Math.max(60, selected.score)),
      reasoning: selected.reasoning || 'Rule-based selection'
    };
  }

  /**
   * Calculate voice score based on analysis
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} analysis - Book analysis
   * @returns {Object} Score and reasoning
   */
  calculateVoiceScore(voiceData, analysis) {
    let score = 50; // Base score
    const reasons = [];

    // Gender matching (if known)
    if (analysis.authorGender !== 'unknown') {
      if (voiceData.gender === analysis.authorGender) {
        score += 25;
        reasons.push(`Matches author gender (${analysis.authorGender})`);
      } else {
        score -= 5;
      }
    }

    // Genre matching
    const genreMatches = this.findGenreMatches(analysis.genres, voiceData.bestFor);
    if (genreMatches.length > 0) {
      score += genreMatches.length * 15;
      reasons.push(`Genre match: ${genreMatches.join(', ')}`);
    }

    // Authority level matching
    if (analysis.authorityLevel === 'high') {
      if (['ash', 'onyx', 'sage'].includes(voiceData.gender === 'male' ? 'match' : 'no')) {
        score += 10;
        reasons.push('Authoritative voice for high-authority content');
      }
    }

    // Content style matching
    if (analysis.contentStyle === 'conversational' && voiceData.personality === 'conversational') {
      score += 15;
      reasons.push('Conversational style match');
    }

    // Tone matching
    if (analysis.tone === 'authoritative' && ['ash', 'onyx'].includes(voiceData.tone)) {
      score += 10;
      reasons.push('Authoritative tone match');
    }

    // Business/finance specific logic
    if (analysis.genres.some(g => ['business', 'finance', 'entrepreneurship'].includes(g))) {
      if (voiceData.bestFor.includes('business') || voiceData.bestFor.includes('professional')) {
        score += 20;
        reasons.push('Business content match');
      }
    }

    // Self-help specific logic
    if (analysis.genres.some(g => ['self-help', 'personal development'].includes(g))) {
      if (voiceData.bestFor.includes('self-help') || voiceData.bestFor.includes('personal-development')) {
        score += 15;
        reasons.push('Self-help content match');
      }
    }

    return {
      total: Math.min(100, score),
      reasoning: reasons.join('; ') || 'General compatibility'
    };
  }

  /**
   * Find matching genres between book and voice
   * @param {Array} bookGenres - Book genres
   * @param {Array} voiceBestFor - Voice best-for categories
   * @returns {Array} Matching categories
   */
  findGenreMatches(bookGenres, voiceBestFor) {
    const matches = [];
    
    for (const genre of bookGenres) {
      const mappedCategories = this.genreMapping[genre] || [];
      for (const category of mappedCategories) {
        if (voiceBestFor.includes(category)) {
          matches.push(category);
        }
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Infer author gender from name (basic heuristic)
   * @param {string} authorName - Author name
   * @returns {string} Inferred gender or 'unknown'
   */
  inferAuthorGender(authorName) {
    if (!authorName) return 'unknown';

    // Common male name patterns
    const malePatterns = [
      /\bRobert\b/i, /\bJohn\b/i, /\bMichael\b/i, /\bDavid\b/i, /\bJames\b/i,
      /\bWilliam\b/i, /\bRichard\b/i, /\bCharles\b/i, /\bThomas\b/i, /\bDaniel\b/i,
      /\bMatthew\b/i, /\bAnthony\b/i, /\bMark\b/i, /\bDonald\b/i, /\bSteven\b/i,
      /\bPaul\b/i, /\bAndrew\b/i, /\bJoshua\b/i, /\bKenneth\b/i, /\bKevin\b/i,
      /\bBrian\b/i, /\bGeorge\b/i, /\bTimothy\b/i, /\bRonald\b/i, /\bJason\b/i,
      /\bEdward\b/i, /\bJeffrey\b/i, /\bRyan\b/i, /\bJacob\b/i, /\bGary\b/i,
      /\bNicholas\b/i, /\bEric\b/i, /\bJonathan\b/i, /\bStephen\b/i, /\bLarry\b/i,
      /\bJustin\b/i, /\bScott\b/i, /\bBrandon\b/i, /\bBenjamin\b/i, /\bSamuel\b/i,
      /\bFrank\b/i, /\bGregory\b/i, /\bRaymond\b/i, /\bAlexander\b/i, /\bPatrick\b/i,
      /\bJack\b/i, /\bDennis\b/i, /\bJerry\b/i, /\bTyler\b/i, /\bAaron\b/i,
      /\bJose\b/i, /\bHenry\b/i, /\bAdam\b/i, /\bDouglas\b/i, /\bNathan\b/i,
      /\bPeter\b/i, /\bZachary\b/i, /\bKyle\b/i, /\bNoah\b/i, /\bAlan\b/i,
      /\bEthan\b/i, /\bJeremy\b/i, /\bLionel\b/i, /\bWayne\b/i, /\bBruce\b/i
    ];

    // Common female name patterns
    const femalePatterns = [
      /\bMary\b/i, /\bPatricia\b/i, /\bJennifer\b/i, /\bLinda\b/i, /\bElizabeth\b/i,
      /\bBarbara\b/i, /\bSusan\b/i, /\bJessica\b/i, /\bSarah\b/i, /\bKaren\b/i,
      /\bNancy\b/i, /\bLisa\b/i, /\bBetty\b/i, /\bHelen\b/i, /\bSandra\b/i,
      /\bDonna\b/i, /\bCarol\b/i, /\bRuth\b/i, /\bSharon\b/i, /\bMichelle\b/i,
      /\bLaura\b/i, /\bSarah\b/i, /\bKimberly\b/i, /\bDeborah\b/i, /\bDorothy\b/i,
      /\bAmy\b/i, /\bAngela\b/i, /\bAshley\b/i, /\bBrenda\b/i, /\bEmma\b/i,
      /\bOlivia\b/i, /\bCynthia\b/i, /\bMarie\b/i, /\bJanet\b/i, /\bCatherine\b/i,
      /\bFrances\b/i, /\bChristine\b/i, /\bSamantha\b/i, /\bDebra\b/i, /\bRachel\b/i,
      /\bCarolyn\b/i, /\bJanet\b/i, /\bVirginia\b/i, /\bMaria\b/i, /\bHeather\b/i,
      /\bDiane\b/i, /\bJulie\b/i, /\bJoyce\b/i, /\bVictoria\b/i, /\bKelly\b/i,
      /\bChristina\b/i, /\bJoan\b/i, /\bEvelyn\b/i, /\bLauren\b/i, /\bJudith\b/i,
      /\bMegan\b/i, /\bCheryl\b/i, /\bAndrea\b/i, /\bHannah\b/i, /\bJacqueline\b/i,
      /\bMartha\b/i, /\bGloria\b/i, /\bSara\b/i, /\bJanice\b/i, /\bKathryn\b/i,
      /\bAnne\b/i, /\bKathy\b/i, /\bAlice\b/i, /\bTeresa\b/i, /\bOprah\b/i,
      /\bBrenė\b/i, /\bMarie\b/i, /\bSheryl\b/i, /\bMelinda\b/i, /\bArianna\b/i
    ];

    // Check for male patterns
    for (const pattern of malePatterns) {
      if (pattern.test(authorName)) {
        return 'male';
      }
    }

    // Check for female patterns
    for (const pattern of femalePatterns) {
      if (pattern.test(authorName)) {
        return 'female';
      }
    }

    return 'unknown';
  }

  /**
   * Normalize genre names for consistent matching
   * @param {Array} genres - Array of genre strings
   * @returns {Array} Normalized genres
   */
  normalizeGenres(genres) {
    if (!Array.isArray(genres)) return [];
    
    return genres.map(genre => 
      genre.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
    );
  }

  /**
   * Infer book tone from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Inferred tone
   */
  inferBookTone(metadata) {
    const title = (metadata.title || '').toLowerCase();
    const themes = (metadata.core_themes || []).join(' ').toLowerCase();
    const purpose = (metadata.primary_purpose || '').toLowerCase();

    if (title.includes('rich') || title.includes('wealth') || title.includes('money')) {
      return 'authoritative';
    }
    
    if (themes.includes('motivational') || themes.includes('inspirational')) {
      return 'inspiring';
    }
    
    if (themes.includes('gentle') || themes.includes('mindful') || themes.includes('wellness')) {
      return 'gentle';
    }
    
    if (purpose.includes('challenge') || purpose.includes('transform')) {
      return 'confident';
    }

    return 'balanced';
  }

  /**
   * Infer authority level from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Authority level
   */
  inferAuthorityLevel(metadata) {
    const reception = (metadata.reception_impact || []).join(' ').toLowerCase();
    const genres = this.normalizeGenres(metadata.genre || []);
    
    if (reception.includes('bestseller') || reception.includes('million copies')) {
      return 'high';
    }
    
    if (genres.some(g => ['business', 'leadership', 'finance'].includes(g))) {
      return 'high';
    }
    
    if (genres.some(g => ['self-help', 'personal development'].includes(g))) {
      return 'medium';
    }

    return 'medium';
  }

  /**
   * Infer content style from metadata
   * @param {Object} metadata - Book metadata
   * @returns {string} Content style
   */
  inferContentStyle(metadata) {
    const style = (metadata.style_tone || []).join(' ').toLowerCase();
    const structure = metadata.structure_format || {};
    const narrativeStyle = (structure.narrative_style || '').toLowerCase();

    if (narrativeStyle.includes('story') || narrativeStyle.includes('anecdotal')) {
      return 'narrative';
    }
    
    if (style.includes('conversational')) {
      return 'conversational';
    }
    
    if (style.includes('straightforward') || style.includes('direct')) {
      return 'direct';
    }

    return 'balanced';
  }
}

export default RuleBasedVoiceSelector;
