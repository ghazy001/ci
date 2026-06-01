type AdfNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, any>;
  content?: AdfNode[];
};

export type ParsedBlock =
  | { type: 'heading'; text: string; level?: number }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'ordered_list'; items: string[] }
  | { type: 'task_list'; items: { text: string; checked: boolean }[] };

export type DetectedSectionType =
  | 'description'
  | 'acceptance_criteria'
  | 'business_rules'
  | 'tasks'
  | 'test_cases'
  | 'definition_of_done'
  | 'notes'
  | 'other';

export type DetectedSection = {
  type: DetectedSectionType;
  title?: string;
  blocks: ParsedBlock[];
};

type ExtraSections = {
  tasks: string[];
  testCases: string[];
  definitionOfDone: string[];
  notes: string[];
};

type BuildResult = {
  blocks: ParsedBlock[];
  sections: DetectedSection[];
  description: string;
  acceptanceCriteria: string[];
  businessRules: string[];
  extraSections: ExtraSections;
  confidence: number;
};

const ACCEPTANCE_ALIASES = [
  'acceptance criteria',
  'acceptance criterion',
  'critere dacceptation',
  'criteres dacceptation',
  'critere acceptation',
  'criteres acceptation',
  'conditions dacceptation',
  'condition dacceptation',
  'definition of ready',
  'definition du pret',
  'definition du ready',
];

const BUSINESS_RULE_ALIASES = [
  'business rules',
  'business rule',
  'regle metier',
  'regles metier',
  'regles business',
  'contraintes',
  'contrainte',
  'contraintes techniques',
  'contrainte technique',
  'notes techniques',
  'regles fonctionnelles',
  'regle fonctionnelle',
  'functional rules',
  'prerequis',
  'pre requis',
];

const TASK_ALIASES = [
  'tasks',
  'task',
  'subtasks',
  'subtask',
  'tasks subtasks',
  'task subtasks',
  'to do',
  'todo',
  'taches',
  'tache',
  'sous taches',
  'sous tache',
  'travaux',
  'actions',
  'a faire',
];

const TEST_CASE_ALIASES = [
  'test cases',
  'test case',
  'cas de test',
  'cas de tests',
  'tests',
  'test scenarios',
  'scenarios',
  'scenarios de test',
  'scenario de test',
  'jeux de test',
];

const DOD_ALIASES = [
  'definition of done',
  'done criteria',
  'dod',
  'definition de done',
  'definition du termine',
  'definition de termine',
  'definition du fini',
  'definition de fini',
  'definition de fait',
  'definition du fait',
];

const NOTES_ALIASES = [
  'notes',
  'notes attachments',
  'attachments',
  'pieces jointes',
  'piece jointe',
  'references',
  'liens utiles',
  'documents',
  'documentation',
  'annexes',
];

export class JiraAdfParser {
  static build(adf: unknown): BuildResult {
    const blocks = this.parse(adf);
    const sections = this.detectSections(blocks);

    const description = this.renderDescription(
      sections.filter((section) => section.type === 'description'),
    );

    const rawAcceptanceCriteria = this.collectItems(
      sections.filter((section) => section.type === 'acceptance_criteria'),
    );

    const rawBusinessRules = this.collectItems(
      sections.filter((section) => section.type === 'business_rules'),
    );

    const postProcessed = this.postProcessAcceptanceAndBusinessRules(
      rawAcceptanceCriteria,
      rawBusinessRules,
    );

    const rawExtraSections: ExtraSections = {
      tasks: this.collectItems(
        sections.filter((section) => section.type === 'tasks'),
      ),
      testCases: this.collectItems(
        sections.filter((section) => section.type === 'test_cases'),
      ),
      definitionOfDone: this.collectItems(
        sections.filter((section) => section.type === 'definition_of_done'),
      ),
      notes: this.collectItems(
        sections.filter((section) => section.type === 'notes'),
      ),
    };

    const finalized = this.postProcessExtraSections(
      postProcessed.businessRules,
      rawExtraSections,
    );

    const confidence = this.computeConfidence({
      blocks,
      sections,
      description,
      acceptanceCriteria: postProcessed.acceptanceCriteria,
      businessRules: finalized.businessRules,
    });

    return {
      blocks,
      sections,
      description,
      acceptanceCriteria: postProcessed.acceptanceCriteria,
      businessRules: finalized.businessRules,
      extraSections: finalized.extraSections,
      confidence,
    };
  }

  static parse(adf: unknown): ParsedBlock[] {
    const root = adf as AdfNode | null | undefined;

    if (!root || root.type !== 'doc' || !Array.isArray(root.content)) {
      return [];
    }

    const blocks: ParsedBlock[] = [];

    for (const node of root.content) {
      if (!node?.type) continue;

      switch (node.type) {
        case 'heading': {
          const text = this.cleanText(this.nodeText(node));
          if (text) {
            blocks.push({
              type: 'heading',
              text,
              level:
                typeof node.attrs?.level === 'number'
                  ? node.attrs.level
                  : undefined,
            });
          }
          break;
        }

        case 'paragraph': {
          const text = this.cleanText(this.nodeText(node));
          if (text) {
            blocks.push({ type: 'paragraph', text });
          }
          break;
        }

        case 'bulletList': {
          const items = this.flattenList(node);
          if (items.length) {
            blocks.push({ type: 'bullet_list', items });
          }
          break;
        }

        case 'orderedList': {
          const items = this.flattenList(node);
          if (items.length) {
            blocks.push({ type: 'ordered_list', items });
          }
          break;
        }

        case 'taskList': {
          const items = this.flattenTaskList(node);
          if (items.length) {
            blocks.push({ type: 'task_list', items });
          }
          break;
        }

        default: {
          const text = this.cleanText(this.nodeText(node));
          if (text) {
            blocks.push({ type: 'paragraph', text });
          }
        }
      }
    }

    return blocks;
  }

  private static detectSections(blocks: ParsedBlock[]): DetectedSection[] {
    const hasHeadings = blocks.some((block) => block.type === 'heading');

    if (hasHeadings) {
      return this.detectSectionsFromHeadings(blocks);
    }

    return this.detectSectionsWithoutHeadings(blocks);
  }

  private static detectSectionsFromHeadings(
    blocks: ParsedBlock[],
  ): DetectedSection[] {
    const sections: DetectedSection[] = [];
    let current: DetectedSection = {
      type: 'description',
      blocks: [],
    };

    for (const block of blocks) {
      if (block.type === 'heading') {
        if (current.blocks.length) {
          sections.push(current);
        }

        current = {
          type: this.classifyHeading(block.text),
          title: block.text,
          blocks: [],
        };

        continue;
      }

      current.blocks.push(block);
    }

    if (current.blocks.length) {
      sections.push(current);
    }

    return sections;
  }

  private static detectSectionsWithoutHeadings(
    blocks: ParsedBlock[],
  ): DetectedSection[] {
    const sections: DetectedSection[] = [];
    const descriptionBlocks: ParsedBlock[] = [];
    let listIndex = 0;

    for (const block of blocks) {
      if (block.type === 'paragraph') {
        if (sections.length === 0) {
          descriptionBlocks.push(block);
        } else {
          sections.push({
            type: 'other',
            blocks: [block],
          });
        }
        continue;
      }

      if (
        block.type === 'bullet_list' ||
        block.type === 'ordered_list' ||
        block.type === 'task_list'
      ) {
        sections.push({
          type: this.classifyUnlabeledList(block, listIndex),
          blocks: [block],
        });
        listIndex += 1;
      }
    }

    if (descriptionBlocks.length) {
      sections.unshift({
        type: 'description',
        blocks: descriptionBlocks,
      });
    }

    return sections;
  }

  private static classifyHeading(rawHeading: string): DetectedSectionType {
    const heading = this.normalizeHeading(rawHeading);

    if (this.matchesAnyAlias(heading, ACCEPTANCE_ALIASES)) {
      return 'acceptance_criteria';
    }

    if (this.matchesAnyAlias(heading, BUSINESS_RULE_ALIASES)) {
      return 'business_rules';
    }

    if (this.matchesAnyAlias(heading, TASK_ALIASES)) {
      return 'tasks';
    }

    if (this.matchesAnyAlias(heading, TEST_CASE_ALIASES)) {
      return 'test_cases';
    }

    if (this.matchesAnyAlias(heading, DOD_ALIASES)) {
      return 'definition_of_done';
    }

    if (this.matchesAnyAlias(heading, NOTES_ALIASES)) {
      return 'notes';
    }

    return 'other';
  }

  private static classifyUnlabeledList(
    block: Extract<
      ParsedBlock,
      { type: 'bullet_list' | 'ordered_list' | 'task_list' }
    >,
    listIndex: number,
  ): DetectedSectionType {
    const items =
      block.type === 'task_list'
        ? block.items.map((item) => item.text)
        : block.items;

    const normalizedItems = items.map((item) => this.normalizeText(item));

    const scores: Record<DetectedSectionType, number> = {
      description: 0,
      acceptance_criteria: 0,
      business_rules: 0,
      tasks: 0,
      test_cases: 0,
      definition_of_done: 0,
      notes: 0,
      other: 0,
    };

    for (const item of normalizedItems) {
      if (
        /^(design|implement|connect|handle|add|create|build|update|fix|setup|configure|write|refactor)\b/.test(
          item,
        ) ||
        /^(concevoir|implementer|connecter|gerer|ajouter|creer|corriger|mettre a jour|configurer|rediger|refactoriser|integrer|developper)\b/.test(
          item,
        )
      ) {
        scores.tasks += 3;
      }

      if (
        /^(valid|invalid|empty|forgot)\b/.test(item) ||
        /^(valide|invalide|vide|oublie|mot de passe oublie)\b/.test(item) ||
        item.includes('→') ||
        item.includes('->') ||
        /\berror\b/.test(item) ||
        /\bsuccess\b/.test(item) ||
        /\bworks\b/.test(item) ||
        /\berreur\b/.test(item) ||
        /\bsucces\b/.test(item) ||
        /\breussit\b/.test(item) ||
        /\bfail(ed)?\b/.test(item) ||
        /\bechec\b/.test(item)
      ) {
        scores.test_cases += 3;
      }

      if (
        /\bcode reviewed\b/.test(item) ||
        /\bmerged\b/.test(item) ||
        /\btests passed\b/.test(item) ||
        /\bdeployed\b/.test(item) ||
        /\bstaging\b/.test(item) ||
        /\bdesktop\b/.test(item) ||
        /\bmobile\b/.test(item) ||
        /\bcode relu\b/.test(item) ||
        /\bmerge\b/.test(item) ||
        /\btests? passes?\b/.test(item) ||
        /\bdeploye\b/.test(item) ||
        /\bpreproduction\b/.test(item) ||
        /\bproduction\b/.test(item) ||
        /\bfonctionne sur desktop\b/.test(item) ||
        /\bfonctionne sur mobile\b/.test(item)
      ) {
        scores.definition_of_done += 4;
      }

      if (
        /\bfigma\b/.test(item) ||
        /\bdocumentation\b/.test(item) ||
        /\blink\b/.test(item) ||
        /\battachment\b/.test(item) ||
        /\bapi doc\b/.test(item) ||
        /\blien\b/.test(item) ||
        /\bpiece jointe\b/.test(item) ||
        /\bpieces jointes\b/.test(item) ||
        /\bdocument\b/.test(item) ||
        /\breference\b/.test(item)
      ) {
        scores.notes += 4;
      }

      if (
        /^(user|system)\b/.test(item) ||
        /^(utilisateur|systeme|le systeme|l utilisateur)\b/.test(item) ||
        /\bcan\b/.test(item) ||
        /\bshould\b/.test(item) ||
        /\bmust\b/.test(item) ||
        /\bvalidates?\b/.test(item) ||
        /\bredirected\b/.test(item) ||
        /\bavailable\b/.test(item) ||
        /\bpeut\b/.test(item) ||
        /\bdoit\b/.test(item) ||
        /\bvalide\b/.test(item) ||
        /\bredirige\b/.test(item) ||
        /\bdisponible\b/.test(item) ||
        /\baffiche\b/.test(item)
      ) {
        scores.acceptance_criteria += 2;
      }

      if (
        /\bonly\b/.test(item) ||
        /\bcannot\b/.test(item) ||
        /\bcan not\b/.test(item) ||
        /\bmust not\b/.test(item) ||
        /\brequired\b/.test(item) ||
        /\bforbidden\b/.test(item) ||
        /\blimit\b/.test(item) ||
        /\bseulement\b/.test(item) ||
        /\bne peut pas\b/.test(item) ||
        /\binterdit\b/.test(item) ||
        /\bobligatoire\b/.test(item) ||
        /\brequis\b/.test(item) ||
        /\brequise\b/.test(item) ||
        /\blimite\b/.test(item) ||
        /\bminimum\b/.test(item) ||
        /\bmaximum\b/.test(item)
      ) {
        scores.business_rules += 2;
      }
    }

    const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

    if (winner && winner[1] > 0) {
      return winner[0] as DetectedSectionType;
    }

    if (listIndex === 0) return 'acceptance_criteria';
    if (listIndex === 1) return 'tasks';
    if (listIndex === 2) return 'test_cases';
    if (listIndex === 3) return 'definition_of_done';
    if (listIndex === 4) return 'notes';

    return 'other';
  }

  private static postProcessAcceptanceAndBusinessRules(
    acceptanceCriteria: string[],
    businessRules: string[],
  ): {
    acceptanceCriteria: string[];
    businessRules: string[];
  } {
    const finalAcceptanceCriteria: string[] = [];
    const inferredBusinessRules: string[] = [];

    for (const item of acceptanceCriteria) {
      const classification = this.classifyCriterionOrRule(item);

      if (classification === 'business_rule') {
        inferredBusinessRules.push(item);
      } else {
        finalAcceptanceCriteria.push(item);
      }
    }

    return {
      acceptanceCriteria: this.uniqueClean(finalAcceptanceCriteria),
      businessRules: this.uniqueClean([
        ...businessRules,
        ...inferredBusinessRules,
      ]),
    };
  }

  private static postProcessExtraSections(
    businessRules: string[],
    extraSections: ExtraSections,
  ): {
    businessRules: string[];
    extraSections: ExtraSections;
  } {
    const finalBusinessRules = [...businessRules];
    const finalNotes: string[] = [];

    for (const rawNote of extraSections.notes) {
      const noteParts = this.splitLogicalLines(rawNote);

      for (const part of noteParts) {
        const classification = this.classifyCriterionOrRule(part);

        if (classification === 'business_rule') {
          finalBusinessRules.push(part);
        } else {
          finalNotes.push(part);
        }
      }
    }

    return {
      businessRules: this.uniqueClean(finalBusinessRules),
      extraSections: {
        tasks: this.normalizeSectionItems(extraSections.tasks),
        testCases: this.normalizeSectionItems(extraSections.testCases),
        definitionOfDone: this.normalizeSectionItems(
          extraSections.definitionOfDone,
        ),
        notes: this.normalizeSectionItems(finalNotes),
      },
    };
  }

  private static normalizeSectionItems(values: string[]): string[] {
    return this.uniqueClean(
      values.flatMap((value) => this.splitLogicalLines(value)),
    );
  }

  private static splitLogicalLines(value: string): string[] {
    return value
      .split(/\r?\n+/)
      .map((part) => this.cleanText(part))
      .filter(Boolean);
  }

  private static classifyCriterionOrRule(
    value: string,
  ): 'acceptance_criterion' | 'business_rule' {
    const text = this.normalizeText(value);

    let ruleScore = 0;
    let acceptanceScore = 0;

    if (
      /\bonly\b/.test(text) ||
      /\bcannot\b/.test(text) ||
      /\bcan not\b/.test(text) ||
      /\bmust not\b/.test(text) ||
      /\bmust\b/.test(text) ||
      /\brequired\b/.test(text) ||
      /\bforbidden\b/.test(text) ||
      /\bmaximum\b/.test(text) ||
      /\bminimum\b/.test(text) ||
      /\bat least\b/.test(text) ||
      /\bno more than\b/.test(text) ||
      /\blimit\b/.test(text) ||
      /\bvalid email format\b/.test(text) ||
      /\bformat\b/.test(text) ||
      /\blength\b/.test(text) ||
      /\bmust have\b/.test(text) ||
      /\bcan not be empty\b/.test(text) ||
      /\bne peut pas\b/.test(text) ||
      /\bdoit\b/.test(text) ||
      /\bdoivent\b/.test(text) ||
      /\bobligatoire\b/.test(text) ||
      /\bobligatoires\b/.test(text) ||
      /\brequis\b/.test(text) ||
      /\brequise\b/.test(text) ||
      /\brequises\b/.test(text) ||
      /\binterdit\b/.test(text) ||
      /\bau moins\b/.test(text) ||
      /\bau plus\b/.test(text) ||
      /\bformat valide\b/.test(text) ||
      /\bchamp obligatoire\b/.test(text) ||
      /\bchamps obligatoires\b/.test(text) ||
      /\bne doit pas\b/.test(text) ||
      /\bne peuvent pas\b/.test(text) ||
      (/\bmot de passe\b/.test(text) && /\bdoit\b/.test(text)) ||
      (/\bemail\b/.test(text) && /\bobligatoire\b/.test(text))
    ) {
      ruleScore += 3;
    }

    if (
      text.startsWith('system validates') ||
      text.startsWith('system prevents') ||
      text.startsWith('system requires') ||
      text.startsWith('password must') ||
      text.startsWith('email is required') ||
      text.startsWith('password can not') ||
      text.startsWith('email can not') ||
      text.startsWith('le systeme valide') ||
      text.startsWith('le systeme verifie') ||
      text.startsWith('le systeme exige') ||
      text.startsWith('le systeme interdit') ||
      text.startsWith('mot de passe doit') ||
      text.startsWith('email est obligatoire') ||
      text.startsWith('le champ email est obligatoire') ||
      text.startsWith('le champ mot de passe est obligatoire')
    ) {
      ruleScore += 3;
    }

    if (
      text.startsWith('user can') ||
      text.startsWith('user is redirected') ||
      text.startsWith('user receives') ||
      text.includes('link is available') ||
      text.includes('success') ||
      text.includes('error message') ||
      text.startsWith('l utilisateur peut') ||
      text.startsWith('utilisateur peut') ||
      text.startsWith('l utilisateur est redirige') ||
      text.startsWith('utilisateur est redirige') ||
      text.startsWith('l utilisateur recoit') ||
      text.startsWith('utilisateur recoit') ||
      text.includes('lien est disponible') ||
      text.includes('message d erreur') ||
      text.includes('message derreur')
    ) {
      acceptanceScore += 2;
    }

    if (
      (text.startsWith('system validates') ||
        text.startsWith('le systeme valide')) &&
      (/\brequired\b/.test(text) || /\bobligatoire\b/.test(text))
    ) {
      ruleScore += 1;
    }

    if (ruleScore >= acceptanceScore + 1 && ruleScore >= 3) {
      return 'business_rule';
    }

    return 'acceptance_criterion';
  }

  private static matchesAnyAlias(value: string, aliases: string[]): boolean {
    return aliases.some((alias) =>
      value.includes(this.normalizeHeading(alias)),
    );
  }

  private static normalizeHeading(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s→-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static nodeText(node: AdfNode): string {
    if (!node) return '';

    if (node.type === 'text') {
      return node.text ?? '';
    }

    if (node.type === 'hardBreak') {
      return '\n';
    }

    if (!Array.isArray(node.content)) {
      return '';
    }

    return node.content.map((child) => this.nodeText(child)).join('');
  }

  private static flattenList(listNode: AdfNode): string[] {
    if (!Array.isArray(listNode.content)) return [];

    return listNode.content.flatMap((item) => this.flattenListItem(item));
  }

  private static flattenListItem(itemNode: AdfNode): string[] {
    if (!Array.isArray(itemNode.content)) return [];

    const paragraphTexts: string[] = [];
    const nestedItems: string[] = [];

    for (const child of itemNode.content) {
      if (!child?.type) continue;

      if (child.type === 'paragraph') {
        const text = this.cleanText(this.nodeText(child));
        if (text) {
          paragraphTexts.push(text);
        }
        continue;
      }

      if (
        child.type === 'bulletList' ||
        child.type === 'orderedList' ||
        child.type === 'taskList'
      ) {
        if (child.type === 'taskList') {
          nestedItems.push(
            ...this.flattenTaskList(child).map((task) => task.text),
          );
        } else {
          nestedItems.push(...this.flattenList(child));
        }
        continue;
      }

      const text = this.cleanText(this.nodeText(child));
      if (text) {
        paragraphTexts.push(text);
      }
    }

    const baseText = this.cleanText(paragraphTexts.join(' '));

    if (nestedItems.length && baseText) {
      return nestedItems.map((nestedItem) =>
        this.combinePrefixWithChild(baseText, nestedItem),
      );
    }

    if (nestedItems.length) {
      return nestedItems;
    }

    return baseText ? [baseText] : [];
  }

  private static flattenTaskList(
    taskListNode: AdfNode,
  ): { text: string; checked: boolean }[] {
    if (!Array.isArray(taskListNode.content)) return [];

    const result: { text: string; checked: boolean }[] = [];

    for (const item of taskListNode.content) {
      if (!item) continue;

      const text = this.cleanText(this.nodeText(item));
      if (!text) continue;

      result.push({
        text,
        checked: item.attrs?.state === 'DONE',
      });
    }

    return result;
  }

  private static combinePrefixWithChild(prefix: string, child: string): string {
    const cleanPrefix = prefix.trim();
    const cleanChild = child.trim();

    if (!cleanPrefix) return cleanChild;
    if (!cleanChild) return cleanPrefix;

    if (/[:;.!?]$/.test(cleanPrefix)) {
      return `${cleanPrefix} ${cleanChild}`;
    }

    return `${cleanPrefix}: ${cleanChild}`;
  }

  private static renderDescription(sections: DetectedSection[]): string {
    const parts: string[] = [];

    for (const section of sections) {
      for (const block of section.blocks) {
        if (block.type === 'paragraph') {
          parts.push(block.text);
          continue;
        }

        if (block.type === 'bullet_list' || block.type === 'ordered_list') {
          parts.push(block.items.map((item) => `- ${item}`).join('\n'));
          continue;
        }

        if (block.type === 'task_list') {
          parts.push(
            block.items
              .map((item) => `- ${item.checked ? '[x]' : '[ ]'} ${item.text}`)
              .join('\n'),
          );
        }
      }
    }

    return parts.join('\n\n').trim();
  }

  private static collectItems(sections: DetectedSection[]): string[] {
    const items: string[] = [];

    for (const section of sections) {
      for (const block of section.blocks) {
        if (block.type === 'paragraph') {
          items.push(block.text);
          continue;
        }

        if (block.type === 'bullet_list' || block.type === 'ordered_list') {
          items.push(...block.items);
          continue;
        }

        if (block.type === 'task_list') {
          items.push(...block.items.map((item) => item.text));
        }
      }
    }

    return this.uniqueClean(items);
  }

  private static uniqueClean(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
      const clean = this.cleanText(value);
      if (!clean) continue;

      const key = clean.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      result.push(clean);
    }

    return result;
  }

  private static cleanText(value: string): string {
    return value
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static computeConfidence(input: {
    blocks: ParsedBlock[];
    sections: DetectedSection[];
    description: string;
    acceptanceCriteria: string[];
    businessRules: string[];
  }): number {
    let score = 0.35;

    const structuredSections = input.sections.filter(
      (section) => section.type !== 'description' && section.type !== 'other',
    ).length;

    if (input.blocks.some((block) => block.type === 'heading')) {
      score += 0.15;
    } else if (structuredSections > 0) {
      score += 0.1;
    }

    if (input.description) {
      score += 0.15;
    }

    score += Math.min(structuredSections * 0.08, 0.24);

    if (input.acceptanceCriteria.length > 0) {
      score += 0.12;
    }

    if (input.businessRules.length > 0) {
      score += 0.06;
    }

    return Number(Math.min(score, 0.96).toFixed(2));
  }
}
