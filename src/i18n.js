// ============================================
// INTERNATIONALIZATION (i18n) - Steel and Sigils
// Supports English and Russian
// ============================================

// Default language
const DEFAULT_LANGUAGE = 'en';

// Cookie name for storing language preference
const LANGUAGE_COOKIE_NAME = 'steel_and_sigils_lang';

// ============================================
// TRANSLATION DICTIONARY
// ============================================
const TRANSLATIONS = {
    en: {
        // Game Title
        'game.title': '⚔️ Steel and Sigils 🛡️',
        'game.subtitle': 'Tactical Combat',

        // Language Switcher
        'lang.switch': 'RU',
        'lang.switch.en': 'EN',
        'lang.switch.ru': 'RU',
        'lang.tooltip': 'Switch language',

        // Map Selection
        'map.select.title': 'Choose Your Battlefield',
        'map.forest.name': 'Whispering Woods',
        'map.forest.stats': '10×8 Grid<br>1000 Points<br>Grass Terrain',
        'map.mountain.name': 'Mountain Pass',
        'map.mountain.stats': '13×11 Grid<br>1300 Points<br>Chokepoint',
        'map.ruins.name': 'Ruins of a Castle',
        'map.ruins.stats': '15×15 Grid<br>1700 Points<br>Dirt & Walls',

        // Faction Selection
        'faction.select.title': '👹 Choose Your Enemy',
        'faction.select.subtitle': 'Select which faction you will face in battle',
        'faction.random.name': 'Random Faction',
        'faction.random.desc': 'Face a random enemy faction.<br><em>Recommended for new players</em>',
        'faction.greenskin.name': 'Greenskin Horde',
        'faction.greenskin.desc': 'Brutal orcs and cunning goblins.<br><span style="color: #8B9A6B;">Balanced • Aggressive</span>',
        'faction.dungeon.name': 'Dungeon Dwellers',
        'faction.dungeon.desc': 'Undead skeletons and animated armor.<br><span style="color: #9B6BAB;">Defensive • Resilient</span>',
        'faction.cultist.name': 'Old God Worshippers',
        'faction.cultist.desc': 'Twisted cultists and eldritch horrors.<br><span style="color: #d94a4a;">Fast • Unpredictable</span>',
        'faction.back': '← Back to Map',
        'faction.confirm': 'Confirm Selection',

        // Army Selection
        'army.title': '⚔️ Build Your Army ⚔️',
        'army.subtitle': 'Spend your points wisely!',
        'army.points': '💰 Points:',
        'army.back': '← Back to Faction',
        'army.confirm': 'Confirm Army',
        'army.confirm.units': 'Confirm Army ({0} units)',

        // Unit Names
        'unit.knight': 'Knight',
        'unit.archer': 'Archer',
        'unit.wizard': 'Wizard',
        'unit.cleric': 'Cleric',
        'unit.rogue': 'Rogue',
        'unit.paladin': 'Paladin',
        'unit.ranger': 'Ranger',
        'unit.berserker': 'Berserker',
        'unit.sorcerer': 'Sorcerer',
        'unit.orc_warrior': 'Orc Warrior',
        'unit.orc_brute': 'Orc Brute',
        'unit.orc_rogue': 'Orc Rogue',
        'unit.goblin_stone_thrower': 'Goblin Stone Thrower',
        'unit.ogre_chieftain': 'Ogre Chieftain',
        'unit.orc_shaman_king': 'Orc Shaman King',
        'unit.loot_goblin': 'Loot Goblin',
        'unit.summoner_lich': 'Summoner Lich',
        'unit.octoth_hroarath': "Octo'th Hroa'rath",
        'unit.the_silence': 'The Silence',
        'unit.void_herald': 'Void Herald',
        'unit.animated_armor': 'Animated Armor',
        'unit.skeleton_archer': 'Skeleton Archer',
        'unit.skeleton_soldier': 'Skeleton Soldier',
        'unit.lost_spirit': 'Lost Spirit',
        'unit.cultist_acolyte': 'Cultist Acolyte',
        'unit.cultist_neophyte': 'Cultist Neophyte',
        'unit.gibbering_horror': 'Gibbering Horror',
        'unit.flesh_warped_stalker': 'Flesh-warped Stalker',
        'unit.banshee_sovereign': 'Banshee Sovereign',
        'unit.dread_knight': 'Dread Knight',
        'unit.iron_colossus': 'Iron Colossus',

        // Unit Stats
        'stat.hp': 'HP',
        'stat.dmg': 'DMG',
        'stat.mov': 'MOV',
        'stat.init': 'INIT',
        'stat.rng': 'RNG',
        'stat.cost': '💰',

        // Unit Passives/Abilities
        'passive.heavy_armor': '🛡️ Passive: -50% ranged dmg',
        'passive.ranged': '📐 Ranged unit',
        'passive.arcane_channeling': '🔮 Passive: +2 Mana/turn',
        'passive.blessed_touch': '💚 Active: Cast Heal',
        'passive.blessed_touch2': '+50% army healing',
        'passive.shadow_step': '👤 Passive: Hit & Run',
        'passive.divine_protection1': '🛡️ -50% ranged dmg',
        'passive.divine_protection2': '💚 +50% healing',
        'passive.eagle_eye': '📐 Longest range unit',
        'passive.bloodlust': '⚔️ Passive: Bloodlust',
        'passive.reckless': 'Reckless',
        'passive.arcane_mastery1': '🔥 Active: Cast Fireball',
        'passive.arcane_mastery2': '✨ +50% spell dmg',

        // Game UI - Left Panel
        'panel.hero': '🔮 Hero',
        'panel.mana': '💧 Mana:',
        'panel.no_buffs': 'No active buffs',
        'panel.spellbook': '📖 <span style="color: #FFD700;">S</span>pell Book',
        'panel.unit_info': '⚔️ Unit Info',
        'panel.select_unit': 'Select a unit',
        'panel.unit_defeated': 'Unit defeated',
        'panel.abilities': '⚡ Abilities',
        'panel.unique_ability': '<span style="color: #FFD700;">U</span>nique ability',
        'panel.end_turn': '⏹️ <span style="color: #FFD700;">E</span>nd Turn',

        // Game UI - Right Panel
        'panel.initiative': '📊 Initiative',
        'panel.battle_log': '📜 Battle Log',
        'panel.show_battle_log': '📜 Show Battle Log',
        'panel.show_initiative': '📊 Show Initiative',

        // Placement Bar
        'placement.title': '📍 Army Placement',
        'placement.randomize': '🎲 Randomize',
        'placement.start': 'Start Battle',

        // Combat Log Modal
        'combat_log.title': '📜 Combat Log',

        // Spell Book
        'spellbook.title': '📖 Spell Book',
        'spellbook.mana': '💧 Mana:',
        'spellbook.regen': '(Regenerates +1 per turn)',
        'spellbook.close': 'Close',
        'spellbook.no_spells': 'No spells known in this school.',
        'spellbook.mana_cost': '💧 {0} Mana',

        // Spell Schools
        'school.destructo': '🔥 Destructo',
        'school.restoratio': '💚 Restoratio',
        'school.benedictio': '🛡️ Benedictio',
        'school.utilitas': '✨ Utilitas',

        // Spell Names
        'spell.fireball': 'Fireball',
        'spell.lightning_bolt': 'Lightning Bolt',
        'spell.heal': 'Heal',
        'spell.haste': 'Haste',
        'spell.shield': 'Shield',
        'spell.ice_storm': 'Ice Storm',
        'spell.meteor': 'Meteor',
        'spell.bless': 'Bless',
        'spell.cure_wounds': 'Cure Wounds',
        'spell.teleport': 'Teleport',
        'spell.chain_lightning': 'Chain Lightning',
        'spell.regenerate': 'Regenerate',

        // Spell Types
        'spell.type.aoe_damage': 'AoE Damage',
        'spell.type.single_damage': 'Single Damage',
        'spell.type.heal': 'Heal',
        'spell.type.buff': 'Buff',
        'spell.type.strong_heal': 'Strong Heal',
        'spell.type.heavy_aoe': 'Heavy AoE',
        'spell.type.multi_damage': 'Multi Damage',
        'spell.type.hot': 'HoT',
        'spell.type.utility': 'Utility',

        // Spell Descriptions
        'spell.desc.fireball': 'Explodes in a 3x3 area dealing 30 damage to all enemies',
        'spell.desc.lightning_bolt': 'Strikes a single enemy for 45 damage',
        'spell.desc.heal': 'Restores 40 HP to a friendly unit',
        'spell.desc.haste': 'Increases movement range by 2 for 3 turns',
        'spell.desc.shield': 'Reduces damage taken by 50% for 2 turns',
        'spell.desc.ice_storm': 'Deals 20 damage and reduces enemy movement by 1 for 2 turns',
        'spell.desc.meteor': 'Devastating 5x5 area attack dealing 60 damage',
        'spell.desc.bless': 'Increases damage dealt by 50% for 3 turns',
        'spell.desc.cure_wounds': 'Powerful healing that restores 80 HP',
        'spell.desc.teleport': 'Instantly moves a unit to any empty tile within range 8',
        'spell.desc.chain_lightning': 'Hits target and chains to 2 nearby enemies for 35 damage each',
        'spell.desc.regenerate': 'Heals 15 HP at the start of each turn for 4 turns',

        // Victory/Defeat
        'victory.title': '🎉 Victory! 🎉',
        'victory.subtitle': 'Choose your rewards for the next battle:',
        'defeat.title': 'Defeat...',
        'defeat.message': 'Your army has fallen...',
        'defeat.submessage': 'Better luck next time, commander.',
        'defeat.retry': '⚔️ Try Again',

        // Rewards
        'reward.recruit': '⚔️ Recruit a New Unit',
        'reward.buff': '💪 Buff an Existing Unit',
        'reward.magic': '🧙 Spell or Mana Enhancement',
        'reward.legendary': '⚡ Legendary Class',
        'reward.legendary_power': '⚡ Legendary Power',
        'reward.epic_power': '⚡ Epic Power',
        'reward.mythic_power': '🔥 Mythic Power',
        'reward.legendary_enhancement': '✨ Legendary Enhancement',
        'reward.no_unit_round1': 'First victory! No new unit yet.',
        'reward.no_unit_later': 'Victory! New unit available in round {0}.',
        'reward.new_unit_every2': '(New units every 2 rounds)',
        'reward.confirm': 'Confirm Choices ({0}/3)',
        'reward.discard_units': 'Discard units<br>for bonus buff',
        'reward.discard_confirm': '⚠️ Confirm?<br>Cannot be undone.',
        'reward.bonus_buff': '💪 Bonus Buff',
        'reward.picks_remaining_one': '1 buff choice remaining',
        'reward.picks_remaining': '{0} buff choices remaining',

        // Loot Goblin Reward
        'loot_goblin.title': 'Loot Goblin Defeated!',
        'loot_goblin.subtitle': 'Choose one of these powerful buffs for your army:',
        'loot_goblin.buff_sets': '✨ 4 buff sets available - each with 3 options! ✨',
        'loot_goblin.skip': 'Skip Bonus (Continue to Normal Rewards)',
        'loot_goblin.select_unit': '💰 Select Unit to Buff',
        'loot_goblin.select_legendary': '⚡ Select Legendary Champion',
        'loot_goblin.cancel': 'Cancel',

        // Buff Names
        'buff.veteran': 'Veteran Training',
        'buff.veteran.desc': '+10 Damage',
        'buff.toughness': 'Enhanced Toughness',
        'buff.toughness.desc': '+30 Max HP',
        'buff.agility': 'Greater Agility',
        'buff.agility.desc': '+1 Movement',
        'buff.precision': 'Precision Strikes',
        'buff.precision.desc': '+5 Initiative & +5 Damage',
        'buff.ranged': 'Ranged Training',
        'buff.ranged.desc': 'Ranged units only: +5 Range',
        'buff.fortified_resolve': 'Fortified Resolve',
        'buff.fortified_resolve.desc': '+3 Initiative, +15 HP',
        'buff.iron_will': 'Iron Will',
        'buff.iron_will.desc': 'Movement locked to base value. Immune to all MOV changes.',
        'buff.berserker_rage': "Berserker's Rage",
        'buff.berserker_rage.desc': '+50% DMG when below 50% HP',
        'buff.last_stand': 'Last Stand',
        'buff.last_stand.desc': 'Survive one lethal hit per battle with 1 HP',
        'buff.juggernaut': 'Juggernaut',
        'buff.juggernaut.desc': 'Immune to knockback and stun. +40 HP',
        'buff.vampiric': 'Vampiric Touch',
        'buff.vampiric.desc': 'Heal 25% of melee damage dealt',
        'buff.champion': "Champion's Favor",
        'buff.champion.desc': '+20 HP, +5 DMG, +1 MOV',
        'buff.obsidian': 'Obsidian Armor',
        'buff.obsidian.desc': 'Max HP x2, Movement -2',
        'buff.glass_cannon': 'Glass Cannon',
        'buff.glass_cannon.desc': 'Damage x2, Max HP x0.5',
        'buff.temporal': 'Temporal Shift',
        'buff.temporal.desc': '2 turns per round. Damage x0.5',

        // Legendary Buffs
        'buff.frenzy': 'Blood Frenzy',
        'buff.frenzy.desc': 'Berserker: Strikes 2 times per attack',
        'buff.cleave': 'Divine Wrath',
        'buff.cleave.desc': 'Paladin: 3x3 cleave attack, +40 damage',
        'buff.ricochet': 'Ricochet Shot',
        'buff.ricochet.desc': 'Ranger: Arrows bounce to nearby targets (2 range, 50% dmg), +40 damage',
        'buff.backstab': 'Shadow Strike',
        'buff.backstab.desc': 'Rogue: 4x damage when attacking from behind (or side)',
        'buff.arcane_blades': 'Arcane Blades',
        'buff.arcane_blades.desc': 'Rogue: Attacks deal magic damage, scaled by spell power and Sorcerer aura. Triggers magic resistances and weaknesses.',

        // Mythic Buffs
        'buff.divine_retribution': 'Divine Retribution',
        'buff.divine_retribution.desc': 'Paladin: Removes passive debuffs. Unlimited retaliation vs melee (x2 DMG).',
        'buff.unstable_arcana': 'Unstable Arcana',
        'buff.unstable_arcana.desc': 'Sorcerer Fireball: 25% 2x dmg, 5% 4x dmg, 50% lingering DoT (50% dmg for 2 turns), 20% 0.1x dmg.',
        'buff.silver_arrows': 'Silver Arrows',
        'buff.silver_arrows.desc': "Ranger: Each hit deals +25% of target's max HP as bonus damage (5% vs bosses). Works with Ricochet.",
        'buff.warlust': 'Warlust',
        'buff.warlust.desc': "Berserker: Each kill also grants +5 permanent Max HP (on top of Bloodlust's +15 DMG).",

        // Magic Buffs
        'magic.mana_max': 'Expanded Mana Pool',
        'magic.mana_max.desc': '+50 Max Mana',
        'magic.mana_regen': 'Mana Flow',
        'magic.mana_regen.desc': '+2 Base Mana Regen per round',
        'magic.spell_power': 'Arcane Power',
        'magic.spell_power.desc': '+25% Spell Damage',
        'magic.healing_surge': 'Healing Surge',
        'magic.healing_surge.desc': '+35% Healing Spell Power',
        'magic.spell_efficiency': 'Efficient Casting',
        'magic.spell_efficiency.desc': '-20% Mana Cost for all spells',
        'magic.mana_restore': 'Mana Surge',
        'magic.mana_restore.desc': 'Fully restore all missing mana instantly',
        'magic.double_cast': 'Twin Cast',
        'magic.double_cast.desc': '+1 spell per round',
        'magic.permanent_buffs': 'Eternal Magic',
        'magic.permanent_buffs.desc': 'Spell buffs no longer expire',
        'magic.army_buffs': 'Mass Enchantment',
        'magic.army_buffs.desc': 'Spells target whole army',
        'magic.spell_echo': 'Spell Echo',
        'magic.spell_echo.desc': '20% chance for hero damage spells to cast twice',

        // Combat Messages
        'combat.round': '══ Round {0} ══',
        'combat.select_target_heal': 'Select target to Heal',
        'combat.select_target_fireball': 'Select target for Fireball',
        'combat.select_target_area': 'Select target area',
        'combat.select_target_enemy': 'Select target enemy',
        'combat.select_friendly_unit': 'Select friendly unit',
        'combat.select_unit_teleport': 'Select a unit to teleport',
        'combat.select_destination': 'Now select destination',
        'combat.spell_cancelled': 'Spell cancelled',
        'combat.ability_cancelled': 'Ability cancelled',
        'combat.invalid_target': 'Invalid target',
        'combat.battle': 'Battle {0}',
        'combat.enemies': 'Battle {0} - {1} enemies!',
        'combat.defeat_enemy': 'Battle 1 - Defeat the enemy!',
        'combat.boss_wave': '👑 BOSS WAVE! 👑',
        'combat.boss_appears': '{0} {1} Appears!',
        'combat.no_space_boss': 'Battle {0} - No space for boss!',
        'combat.silenced': '🔇 Spells are silenced!',
        'combat.silence_lifted': '🔇 Silence lifted!',
        'combat.abilities_silenced': '🔇 Abilities are silenced!',

        // Status Effects
        'status.haste': 'HASTE!',
        'status.shield': 'SHIELD!',
        'status.blessed': 'BLESSED!',
        'status.regenerate': 'REGENERATE!',
        'status.teleport': 'TELEPORT!',
        'status.slowed': 'SLOWED!',
        'status.bloodlust': 'BLOODLUST!',
        'status.cleave': 'CLEAVE!',
        'status.ricochet': 'RICOCHET!',
        'status.backstab': 'BACKSTAB!',
        'status.retribution': 'RETRIBUTION!',
        'status.vanish': 'VANISH!',
        'status.feast': 'FEAST!',
        'status.frenzy': 'FRENZY!',
        'status.summon': 'SUMMON!',
        'status.aura': 'AURA!',
        'status.mutation_speed': 'MUTATION: SPEED!',
        'status.mutation_power': 'MUTATION: POWER!',
        'status.speed_restored': 'SPEED RESTORED!',
        'status.burning': 'Burning!',

        // Combat Log Messages
        'log.cast': 'Hero cast {0}!',
        'log.heal': '{0} used Heal on {1} restoring {2} HP.',
        'log.healed': '{0} was healed for {1} HP.',
        'log.damage': '{0} hit {1} dealing {2} damage.',
        'log.melee': '{0} dealt melee attack to {1} dealing {2} damage.',
        'log.ranged': '{0} dealt ranged attack to {1} dealing {2} damage.',
        'log.kill': '{0} killed {1}!',
        'log.slain': '{0} was slain!',
        'log.haste': '{0} gained HASTE! (+{1} Move).',
        'log.shield': '{0} gained SHIELD! (-{2}% damage taken).',
        'log.bless': '{0} gained BLESS! (+{1}% DMG).',
        'log.regenerate': '{0} gained REGENERATE! ({1} HP/turn).',
        'log.teleport': '{0} was teleported.',
        'log.fireball': '{0} cast Fireball!',
        'log.bloodlust': '{0} gained +15 DMG from Bloodlust! ({1} stacks)',
        'log.vanish': '{0} used Vanish and returned to their starting position.',
        'log.feast': "{0} feasts on {1}'s flesh and gains another turn!",
        'log.void_herald_death': 'Void Herald defeated! Movement speed restored!',
        'log.burning': '{0} takes {1} burning damage from Unstable Arcana.',
        'log.burning_turns': '{0} is burning for {1} damage for 2 turns!',
        'log.mutation_speed': "{0}'s unstable form grants +2 Movement!",
        'log.mutation_power': "{0}'s unstable form grants +10 Damage!",
        'log.unstable_double': 'Double Damage',
        'log.unstable_quad': 'QUAD DAMAGE',
        'log.unstable_dot': 'Lingering Burn',
        'log.unstable_misspell': 'Misspell',

        // Errors/Notifications
        'error.no_mana': 'Not enough mana!',
        'error.spell_failed': 'Spell failed!',
        'error.spells_per_round': 'Can only cast {0} spell(s) per round!',
        'error.unit_acted': 'Unit has already acted',
        'error.heal_used': 'Heal already used this turn',
        'error.pull_used': 'Pull already used this turn',
        'error.fireball_used': 'Fireball already used this turn',
        'error.ability_unavailable': 'Ability not available',

        // Mana
        'mana.regen': '+{0} Mana ({1} + {2} from Wizards)',
    },

    ru: {
        // Game Title
        'game.title': '⚔️ Сталь и Сигилы 🛡️',
        'game.subtitle': 'Тактический Бой',

        // Language Switcher
        'lang.switch': 'EN',
        'lang.switch.en': 'EN',
        'lang.switch.ru': 'RU',
        'lang.tooltip': 'Сменить язык',

        // Map Selection
        'map.select.title': 'Выберите Поле Боя',
        'map.forest.name': 'Шепчущий Лес',
        'map.forest.stats': '10×8 Клеток<br>1000 Очков<br>Трава',
        'map.mountain.name': 'Горный Перевал',
        'map.mountain.stats': '13×11 Клеток<br>1300 Очков<br>Узкие проходы',
        'map.ruins.name': 'Руины Замка',
        'map.ruins.stats': '15×15 Клеток<br>1700 Очков<br>Земля и Стены',

        // Faction Selection
        'faction.select.title': '👹 Выберите Врага',
        'faction.select.subtitle': 'Выберите фракцию, против которой будете сражаться',
        'faction.random.name': 'Случайная Фракция',
        'faction.random.desc': 'Сразитесь со случайной вражеской фракцией.<br><em>Рекомендуется для новых игроков</em>',
        'faction.greenskin.name': 'Орда Зеленокожих',
        'faction.greenskin.desc': 'Жестокие орки и хитрые гоблины.<br><span style="color: #8B9A6B;">Сбалансированные • Агрессивные</span>',
        'faction.dungeon.name': 'Обитатели Подземелья',
        'faction.dungeon.desc': 'Нежить-скелеты и ожившие доспехи.<br><span style="color: #9B6BAB;">Защитные • Стойкие</span>',
        'faction.cultist.name': 'Служители Древних Богов',
        'faction.cultist.desc': 'Искажённые культисты и древние ужасы.<br><span style="color: #d94a4a;">Быстрые • Непредсказуемые</span>',
        'faction.back': '← Назад к Карте',
        'faction.confirm': 'Подтвердить Выбор',

        // Army Selection
        'army.title': '⚔️ Соберите Свою Армию ⚔️',
        'army.subtitle': 'Тратьте очки с умом!',
        'army.points': '💰 Очки:',
        'army.back': '← Назад к Фракции',
        'army.confirm': 'Подтвердить Армию',
        'army.confirm.units': 'Подтвердить Армию ({0} юнитов)',

        // Unit Names
        'unit.knight': 'Рыцарь',
        'unit.archer': 'Лучник',
        'unit.wizard': 'Волшебник',
        'unit.cleric': 'Клирик',
        'unit.rogue': 'Разбойник',
        'unit.paladin': 'Паладин',
        'unit.ranger': 'Следопыт',
        'unit.berserker': 'Берсерк',
        'unit.sorcerer': 'Чародей',
        'unit.orc_warrior': 'Орк-воин',
        'unit.orc_brute': 'Орк-громила',
        'unit.orc_rogue': 'Орк-разбойник',
        'unit.goblin_stone_thrower': 'Гоблин-метатель',
        'unit.ogre_chieftain': 'Вождь Огров',
        'unit.orc_shaman_king': 'Король-шаман Орков',
        'unit.loot_goblin': 'Гоблин-грабитель',
        'unit.summoner_lich': 'Лич-призыватель',
        'unit.octoth_hroarath': "Окто'т Хроа'рат",
        'unit.the_silence': 'Тишина',
        'unit.void_herald': 'Вестник Пустоты',
        'unit.animated_armor': 'Ожившие Доспехи',
        'unit.skeleton_archer': 'Скелет-лучник',
        'unit.skeleton_soldier': 'Скелет-солдат',
        'unit.lost_spirit': 'Потерянный Дух',
        'unit.cultist_acolyte': 'Аколит Культиста',
        'unit.cultist_neophyte': 'Неофит Культиста',
        'unit.gibbering_horror': 'Бормочущий Ужас',
        'unit.flesh_warped_stalker': 'Потрошитель Плоти',
        'unit.banshee_sovereign': 'Владычица Банши',
        'unit.dread_knight': 'Рыцарь Ужаса',
        'unit.iron_colossus': 'Железный Колосс',

        // Unit Stats
        'stat.hp': 'ЗДОР',
        'stat.dmg': 'УРОН',
        'stat.mov': 'ПЕРЕД',
        'stat.init': 'ИНИЦ',
        'stat.rng': 'ДАЛЬН',
        'stat.cost': '💰',

        // Unit Passives/Abilities
        'passive.heavy_armor': '🛡️ Пассивка: -50% от дальнего урона',
        'passive.ranged': '📐 Дальнобойный юнит',
        'passive.arcane_channeling': '🔮 Пассивка: +2 Маны/ход',
        'passive.blessed_touch': '💚 Активное: Исцеление',
        'passive.blessed_touch2': '+50% исцеления армии',
        'passive.shadow_step': '👤 Пассивка: Удар и Бегство',
        'passive.divine_protection1': '🛡️ -50% от дальнего урона',
        'passive.divine_protection2': '💚 +50% исцеления',
        'passive.eagle_eye': '📐 Самая большая дальность',
        'passive.bloodlust': '⚔️ Пассивка: Жажда Крови',
        'passive.reckless': 'Безрассудство',
        'passive.arcane_mastery1': '🔥 Активное: Огненный Шар',
        'passive.arcane_mastery2': '✨ +50% урона от заклинаний',

        // Game UI - Left Panel
        'panel.hero': '🔮 Герой',
        'panel.mana': '💧 Мана:',
        'panel.no_buffs': 'Нет активных баффов',
        'panel.spellbook': '📖 <span style="color: #FFD700;">К</span>нига Заклинаний',
        'panel.unit_info': '⚔️ Инфо о Юните',
        'panel.select_unit': 'Выберите юнита',
        'panel.unit_defeated': 'Юнит повержен',
        'panel.abilities': '⚡ Способности',
        'panel.unique_ability': '<span style="color: #FFD700;">У</span>никальная способность',
        'panel.end_turn': '⏹️ <span style="color: #FFD700;">З</span>акончить Ход',

        // Game UI - Right Panel
        'panel.initiative': '📊 Инициатива',
        'panel.battle_log': '📜 Журнал Боя',
        'panel.show_battle_log': '📜 Показать Журнал',
        'panel.show_initiative': '📊 Показать Инициативу',

        // Placement Bar
        'placement.title': '📍 Размещение Армии',
        'placement.randomize': '🎲 Случайно',
        'placement.start': 'Начать Бой',

        // Combat Log Modal
        'combat_log.title': '📜 Журнал Боя',

        // Spell Book
        'spellbook.title': '📖 Книга Заклинаний',
        'spellbook.mana': '💧 Мана:',
        'spellbook.regen': '(Восстанавливается +1 за ход)',
        'spellbook.close': 'Закрыть',
        'spellbook.no_spells': 'Нет известных заклинаний в этой школе.',
        'spellbook.mana_cost': '💧 {0} Маны',

        // Spell Schools
        'school.destructo': '🔥 Разрушение',
        'school.restoratio': '💚 Исцеление',
        'school.benedictio': '🛡️ Благословение',
        'school.utilitas': '✨ Утилита',

        // Spell Names
        'spell.fireball': 'Огненный Шар',
        'spell.lightning_bolt': 'Удар Молнии',
        'spell.heal': 'Исцеление',
        'spell.haste': 'Спешка',
        'spell.shield': 'Щит',
        'spell.ice_storm': 'Ледяная Буря',
        'spell.meteor': 'Метеор',
        'spell.bless': 'Благословение',
        'spell.cure_wounds': 'Лечение Ран',
        'spell.teleport': 'Телепорт',
        'spell.chain_lightning': 'Цепная Молния',
        'spell.regenerate': 'Регенерация',

        // Spell Types
        'spell.type.aoe_damage': 'Урон по Площади',
        'spell.type.single_damage': 'Одиночный Урон',
        'spell.type.heal': 'Исцеление',
        'spell.type.buff': 'Бафф',
        'spell.type.strong_heal': 'Сильное Исцеление',
        'spell.type.heavy_aoe': 'Мощный Урон по Площади',
        'spell.type.multi_damage': 'Множественный Урон',
        'spell.type.hot': 'Исцеление за Время',
        'spell.type.utility': 'Утилита',

        // Spell Descriptions
        'spell.desc.fireball': 'Взрыв в области 3×3, наносит 30 урона всем врагам',
        'spell.desc.lightning_bolt': 'Ударяет одного врага на 45 урона',
        'spell.desc.heal': 'Восстанавливает 40 ЗДОР дружественному юниту',
        'spell.desc.haste': 'Увеличивает дальность передвижения на 2 на 3 хода',
        'spell.desc.shield': 'Снижает получаемый урон на 50% на 2 хода',
        'spell.desc.ice_storm': 'Наносит 20 урона и снижает передвижение врага на 1 на 2 хода',
        'spell.desc.meteor': 'Разрушительная атака по области 5×5, наносит 60 урона',
        'spell.desc.bless': 'Увеличивает наносимый урон на 50% на 3 хода',
        'spell.desc.cure_wounds': 'Мощное исцеление, восстанавливает 80 ЗДОР',
        'spell.desc.teleport': 'Мгновенно перемещает юнита на любую пустую клетку в радиусе 8',
        'spell.desc.chain_lightning': 'Бьёт цель и перепрыгивает на 2 ближайших врага по 35 урона',
        'spell.desc.regenerate': 'Восстанавливает 15 ЗДОР в начале каждого хода в течение 4 ходов',

        // Victory/Defeat
        'victory.title': '🎉 Победа! 🎉',
        'victory.subtitle': 'Выберите награды для следующего боя:',
        'defeat.title': 'Поражение...',
        'defeat.message': 'Ваша армия пала...',
        'defeat.submessage': 'Повезёт в следующий раз, командир.',
        'defeat.retry': '⚔️ Попробовать Снова',

        // Rewards
        'reward.recruit': '⚔️ Нанять Нового Юнита',
        'reward.buff': '💪 Улучшить Существующего Юнита',
        'reward.magic': '🧙 Усиление Магии или Маны',
        'reward.legendary': '⚡ Легендарный Класс',
        'reward.legendary_power': '⚡ Легендарная Сила',
        'reward.epic_power': '⚡ Эпическая Сила',
        'reward.mythic_power': '🔥 Мифическая Сила',
        'reward.legendary_enhancement': '✨ Легендарное Усиление',
        'reward.no_unit_round1': 'Первая победа! Пока без нового юнита.',
        'reward.no_unit_later': 'Победа! Новый юнит доступен в раунде {0}.',
        'reward.new_unit_every2': '(Новые юниты каждые 2 раунда)',
        'reward.confirm': 'Подтвердить Выбор ({0}/3)',
        'reward.discard_units': 'Отказаться<br>от юнитов',
        'reward.discard_confirm': '⚠️ Подтвердить?<br>Отменить нельзя.',
        'reward.bonus_buff': '💪 Бонусный Бафф',
        'reward.picks_remaining_one': 'Остался 1 выбор баффа',
        'reward.picks_remaining': 'Осталось {0} выборов баффов',

        // Loot Goblin Reward
        'loot_goblin.title': 'Гоблин-Грабитель Повержен!',
        'loot_goblin.subtitle': 'Выберите один из этих мощных баффов для вашей армии:',
        'loot_goblin.buff_sets': '✨ Доступно 4 набора баффов - каждый с 3 вариантами! ✨',
        'loot_goblin.skip': 'Пропустить Бонус (Перейти к Обычным Наградам)',
        'loot_goblin.select_unit': '💰 Выберите Юнита для Улучшения',
        'loot_goblin.select_legendary': '⚡ Выберите Легендарного Чемпиона',
        'loot_goblin.cancel': 'Отмена',

        // Buff Names
        'buff.veteran': 'Ветеранская Тренировка',
        'buff.veteran.desc': '+10 к Урону',
        'buff.toughness': 'Повышенная Стойкость',
        'buff.toughness.desc': '+30 к Макс. Здоровью',
        'buff.agility': 'Повышенная Ловкость',
        'buff.agility.desc': '+1 к Передвижению',
        'buff.precision': 'Точные Удары',
        'buff.precision.desc': '+5 к Инициативе и +5 к Урону',
        'buff.ranged': 'Дальнобойная Тренировка',
        'buff.ranged.desc': 'Только для дальнобойных: +5 к Дальности',
        'buff.fortified_resolve': 'Укреплённая Воля',
        'buff.fortified_resolve.desc': '+3 к Инициативе, +15 к ЗДОР',
        'buff.iron_will': 'Железная Воля',
        'buff.iron_will.desc': 'Скорость зафиксирована на базовом значении. Иммунитет к изменениям ПЕРЕД.',
        'buff.berserker_rage': 'Ярость Берсерка',
        'buff.berserker_rage.desc': '+50% УРОН при ЗДОР ниже 50%',
        'buff.last_stand': 'Последний Рубеж',
        'buff.last_stand.desc': 'Выжить один раз со смертельным ударом с 1 ЗДОР',
        'buff.juggernaut': 'Джаггернаут',
        'buff.juggernaut.desc': 'Иммунитет к отбрасыванию и оглушению. +40 ЗДОР',
        'buff.vampiric': 'Вампирское Касание',
        'buff.vampiric.desc': 'Восстановление 25% от нанесённого урона в ближнем бою',
        'buff.champion': "Милость Чемпиона",
        'buff.champion.desc': '+20 ЗДОР, +5 УРОН, +1 ПЕРЕД',
        'buff.obsidian': 'Обсидиановые Доспехи',
        'buff.obsidian.desc': 'Макс. ЗДОР ×2, Передвижение -2',
        'buff.glass_cannon': 'Стеклянная Пушка',
        'buff.glass_cannon.desc': 'Урон ×2, Макс. ЗДОР ×0.5',
        'buff.temporal': 'Временной Сдвиг',
        'buff.temporal.desc': '2 хода за раунд. Урон ×0.5',

        // Legendary Buffs
        'buff.frenzy': 'Кровавое Безумие',
        'buff.frenzy.desc': 'Берсерк: Бьёт 2 раза за атаку',
        'buff.cleave': 'Божественный Гнев',
        'buff.cleave.desc': 'Паладин: Атака по области 3×3, +40 урона',
        'buff.ricochet': 'Рикошетный Выстрел',
        'buff.ricochet.desc': 'Следопыт: Стрелы отскакивают к ближайшим целям (дальность 2, 50% урона), +40 урона',
        'buff.backstab': 'Теневой Удар',
        'buff.backstab.desc': 'Разбойник: 4× урон при атаке сзади (или сбоку)',
        'buff.arcane_blades': 'Арканные Клинки',
        'buff.arcane_blades.desc': 'Разбойник: Атаки наносят магический урон, усиленный силой заклинаний и аурой Чародея. Учитывает сопротивления и уязвимости к магии.',

        // Mythic Buffs
        'buff.divine_retribution': 'Божественное Возмездие',
        'buff.divine_retribution.desc': 'Паладин: Убирает пассивные дебаффы. Неограниченное возмездие в ближнем бою (×2 УРОН).',
        'buff.unstable_arcana': 'Нестабильная Аркана',
        'buff.unstable_arcana.desc': 'Огненный Шар Чародея: 25% 2× урон, 5% 4× урон, 50% горение (50% урона 2 хода), 20% 0.1× урон.',
        'buff.silver_arrows': 'Серебряные Стрелы',
        'buff.silver_arrows.desc': 'Следопыт: Каждое попадание наносит +25% от макс. ЗДОР цели (5% по боссам). Работает с рикошетом.',
        'buff.warlust': 'Жажда Войны',
        'buff.warlust.desc': 'Берсерк: Каждое убийство также даёт +5 к макс. ЗДОР (помимо +15 УРОН от Жажды Крови).',

        // Magic Buffs
        'magic.mana_max': 'Расширенный Запас Маны',
        'magic.mana_max.desc': '+50 к Макс. Мане',
        'magic.mana_regen': 'Поток Маны',
        'magic.mana_regen.desc': '+2 к Базовой Регенерации Маны за раунд',
        'magic.spell_power': 'Арканная Сила',
        'magic.spell_power.desc': '+25% к Урону от Заклинаний',
        'magic.healing_surge': 'Всплеск Исцеления',
        'magic.healing_surge.desc': '+35% к Силе Исцеляющих Заклинаний',
        'magic.spell_efficiency': 'Эффективное Колдовство',
        'magic.spell_efficiency.desc': '-20% к Стоимости Маны для всех заклинаний',
        'magic.mana_restore': 'Всплеск Маны',
        'magic.mana_restore.desc': 'Мгновенно восстановить всю недостающую ману',
        'magic.double_cast': 'Двойное Колдовство',
        'magic.double_cast.desc': '+1 заклинание за раунд',
        'magic.permanent_buffs': 'Вечная Магия',
        'magic.permanent_buffs.desc': 'Заклинания-баффы больше не истекают',
        'magic.army_buffs': 'Массовое Зачарование',
        'magic.army_buffs.desc': 'Заклинания действуют на всю армию',
        'magic.spell_echo': 'Эхо Заклинания',
        'magic.spell_echo.desc': '20% шанс повторного применения боевых заклинаний',

        // Combat Messages
        'combat.round': '══ Раунд {0} ══',
        'combat.select_target_heal': 'Выберите цель для Исцеления',
        'combat.select_target_fireball': 'Выберите цель для Огненного Шара',
        'combat.select_target_area': 'Выберите область',
        'combat.select_target_enemy': 'Выберите врага',
        'combat.select_friendly_unit': 'Выберите союзного юнита',
        'combat.select_unit_teleport': 'Выберите юнита для телепорта',
        'combat.select_destination': 'Теперь выберите пункт назначения',
        'combat.spell_cancelled': 'Заклинание отменено',
        'combat.ability_cancelled': 'Способность отменена',
        'combat.invalid_target': 'Неверная цель',
        'combat.battle': 'Бой {0}',
        'combat.enemies': 'Бой {0} - {1} врагов!',
        'combat.defeat_enemy': 'Бой 1 - Победите врага!',
        'combat.boss_wave': '👑 ВОЛНА БОССА! 👑',
        'combat.boss_appears': '{0} {1} Появляется!',
        'combat.no_space_boss': 'Бой {0} - Нет места для босса!',
        'combat.silenced': '🔇 Заклинания заглушены!',
        'combat.silence_lifted': '🔇 Заглушение снято!',
        'combat.abilities_silenced': '🔇 Способности заглушены!',

        // Status Effects
        'status.haste': 'СПЕШКА!',
        'status.shield': 'ЩИТ!',
        'status.blessed': 'БЛАГОСЛОВЕН!',
        'status.regenerate': 'РЕГЕНЕРАЦИЯ!',
        'status.teleport': 'ТЕЛЕПОРТ!',
        'status.slowed': 'ЗАМЕДЛЕН!',
        'status.bloodlust': 'ЖАЖДА КРОВИ!',
        'status.cleave': 'РАССЕЧЕНИЕ!',
        'status.ricochet': 'РИКОШЕТ!',
        'status.backstab': 'УДАР В СПИНУ!',
        'status.retribution': 'ВОЗМЕЗДИЕ!',
        'status.vanish': 'ИСЧЕЗНОВЕНИЕ!',
        'status.feast': 'ПИР!',
        'status.frenzy': 'БЕЗУМИЕ!',
        'status.summon': 'ПРИЗЫВ!',
        'status.aura': 'АУРА!',
        'status.mutation_speed': 'МУТАЦИЯ: СКОРОСТЬ!',
        'status.mutation_power': 'МУТАЦИЯ: СИЛА!',
        'status.speed_restored': 'СКОРОСТЬ ВОССТАНОВЛЕНА!',
        'status.burning': 'Горение!',

        // Combat Log Messages
        'log.cast': 'Герой использовал {0}!',
        'log.heal': '{0} использовал Исцеление на {1}, восстановив {2} ЗДОР.',
        'log.healed': '{0} был исцелён на {1} ЗДОР.',
        'log.damage': '{0} попал по {1}, нанеся {2} урона.',
        'log.melee': '{0} нанёс удар в ближнем бою по {1}, урон {2}.',
        'log.ranged': '{0} нанёс дальний удар по {1}, урон {2}.',
        'log.kill': '{0} убил {1}!',
        'log.slain': '{0} был убит!',
        'log.haste': '{0} получил СПЕШКУ! (+{1} к Передвижению).',
        'log.shield': '{0} получил ЩИТ! (-{2}% получаемого урона).',
        'log.bless': '{0} получил БЛАГОСЛОВЕНИЕ! (+{1}% к УРОНУ).',
        'log.regenerate': '{0} получил РЕГЕНЕРАЦИЮ! ({1} ЗДОР/ход).',
        'log.teleport': '{0} был телепортирован.',
        'log.fireball': '{0} использовал Огненный Шар!',
        'log.bloodlust': '{0} получил +15 к УРОНУ от Жажды Крови! ({1} стаков)',
        'log.vanish': '{0} использовал Исчезновение и вернулся на начальную позицию.',
        'log.feast': "{0} пирует на плоти {1} и получает ещё один ход!",
        'log.void_herald_death': 'Вестник Пустоты повержен! Скорость передвижения восстановлена!',
        'log.burning': '{0} получает {1} урона от горения от Нестабильной Арканы.',
        'log.burning_turns': '{0} горит и получает {1} урона в течение 2 ходов!',
        'log.mutation_speed': 'Нестабильная форма {0} даёт +2 к Передвижению!',
        'log.mutation_power': 'Нестабильная форма {0} даёт +10 к Урону!',
        'log.unstable_double': 'Двойной Урон',
        'log.unstable_quad': 'ЧЕТВЕРНОЙ УРОН',
        'log.unstable_dot': 'Длительное Горение',
        'log.unstable_misspell': 'Ошибка Заклинания',

        // Errors/Notifications
        'error.no_mana': 'Недостаточно маны!',
        'error.spell_failed': 'Заклинание провалилось!',
        'error.spells_per_round': 'Можно использовать только {0} заклинание(й) за раунд!',
        'error.unit_acted': 'Юнит уже действовал',
        'error.heal_used': 'Исцеление уже использовано в этот ход',
        'error.pull_used': 'Притягивание уже использовано в этот ход',
        'error.fireball_used': 'Огненный Шар уже использован в этот ход',
        'error.ability_unavailable': 'Способность недоступна',

        // Mana
        'mana.regen': '+{0} Маны ({1} + {2} от Волшебников)',
    }
};

// ============================================
// COOKIE UTILITIES
// ============================================
function setCookie(name, value, days = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }
    return null;
}

// ============================================
// LANGUAGE DETECTION
// ============================================
function detectDefaultLanguage() {
    // First check cookie
    const savedLang = getCookie(LANGUAGE_COOKIE_NAME);
    if (savedLang && TRANSLATIONS[savedLang]) {
        return savedLang;
    }

    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
        const langCode = browserLang.split('-')[0].toLowerCase();
        if (TRANSLATIONS[langCode]) {
            return langCode;
        }
    }

    // Default to English
    return DEFAULT_LANGUAGE;
}

// ============================================
// I18N CLASS
// ============================================
class I18n {
    constructor() {
        this.currentLanguage = detectDefaultLanguage();
        this.listeners = [];
    }

    // Get current language
    getLanguage() {
        return this.currentLanguage;
    }

    // Set language and save to cookie
    setLanguage(lang) {
        if (TRANSLATIONS[lang] && lang !== this.currentLanguage) {
            this.currentLanguage = lang;
            setCookie(LANGUAGE_COOKIE_NAME, lang);
            this.notifyListeners();
            return true;
        }
        return false;
    }

    // Toggle between en and ru
    toggleLanguage() {
        const newLang = this.currentLanguage === 'en' ? 'ru' : 'en';
        return this.setLanguage(newLang);
    }

    // Get translation
    t(key, ...args) {
        const translation = TRANSLATIONS[this.currentLanguage][key] ||
                           TRANSLATIONS[DEFAULT_LANGUAGE][key] ||
                           key;

        // Replace placeholders {0}, {1}, etc.
        if (args.length > 0) {
            return translation.replace(/\{(\d+)\}/g, (match, index) => {
                return args[parseInt(index)] !== undefined ? args[parseInt(index)] : match;
            });
        }

        return translation;
    }

    // Check if translation exists
    has(key) {
        return !!(TRANSLATIONS[this.currentLanguage][key] || TRANSLATIONS[DEFAULT_LANGUAGE][key]);
    }

    // Add listener for language changes
    onChange(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    offChange(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    // Notify all listeners
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.currentLanguage);
            } catch (e) {
                console.error('Error in i18n listener:', e);
            }
        });
    }

    // Update all elements with data-i18n attribute
    updatePage() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translation = this.t(key);
                // Check if content contains HTML
                if (translation.includes('<')) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Update elements with data-i18n-html attribute (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) {
                el.innerHTML = this.t(key);
            }
        });

        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                el.placeholder = this.t(key);
            }
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) {
                el.title = this.t(key);
            }
        });
    }

    // Create language toggle button HTML
    getToggleButtonHTML() {
        const otherLang = this.currentLanguage === 'en' ? 'ru' : 'en';
        const buttonText = otherLang.toUpperCase();
        return `<button id="lang-toggle-btn" class="lang-toggle" title="${this.t('lang.tooltip')}">${buttonText}</button>`;
    }
}

// Create global instance
const i18n = new I18n();

// Make it available globally in browser
if (typeof window !== 'undefined') {
    window.i18n = i18n;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18n, I18n, TRANSLATIONS };
}
