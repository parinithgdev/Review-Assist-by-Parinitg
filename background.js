// Background script for the Review Assist extension
// This runs in the background and handles extension lifecycle events

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Review Assist extension installed');
        
        // Initialize storage with preloaded word categories and default configurations
        chrome.storage.local.get(['wordCategories', 'timestampConfig', 'captionConfig'], (result) => {
            const updates = {};
            
            // Initialize word categories if they don't exist
            if (!result.wordCategories) {
                updates.wordCategories = getPreloadedWords();
                console.log('Initialized with preloaded word categories');
            }
            
            // Set default configurations for backward compatibility
            if (!result.timestampConfig) {
                updates.timestampConfig = {
                    url: '*://atv-optic-domain-tooling-prod-iad.iad.proxy*',
                    element: '.vjs-current-time-display'
                };
                console.log('Set default timestamp configuration');
            }
            
            if (!result.captionConfig) {
                updates.captionConfig = {
                    url: '*://vcc-review-caption-alpha.corp*',
                    element: 'div.panel-body#full-caps'
                };
                console.log('Set default caption configuration');
            }
            
            // Save all updates at once
            if (Object.keys(updates).length > 0) {
                chrome.storage.local.set(updates, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error setting initial configuration:', chrome.runtime.lastError);
                    } else {
                        console.log('Extension initialized successfully');
                    }
                });
            }
        });
        
    } else if (details.reason === 'update') {
        console.log('Review Assist extension updated from version', details.previousVersion);
        
        // On update, merge any new preloaded words with existing ones
        chrome.storage.local.get(['wordCategories'], (result) => {
            const existingWords = result.wordCategories || {};
            const preloadedWords = getPreloadedWords();
            
            // Merge preloaded words with existing user words (user words take precedence)
            const mergedWords = { ...preloadedWords, ...existingWords };
            
            chrome.storage.local.set({ wordCategories: mergedWords }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error updating word categories:', chrome.runtime.lastError);
                } else {
                    console.log('Updated extension with merged word categories');
                }
            });
        });
        
        // Add default configurations if they don't exist (for users upgrading from v1.0)
        chrome.storage.local.get(['timestampConfig', 'captionConfig'], (result) => {
            const updates = {};
            
            if (!result.timestampConfig) {
                updates.timestampConfig = {
                    url: '*://atv-optic-domain-tooling-prod-iad.iad.proxy/*',
                    element: '.vjs-current-time-display'
                };
            }
            
            if (!result.captionConfig) {
                updates.captionConfig = {
                    url: '*://vcc-review-caption-alpha.corp/*',
                    element: 'div.panel-body#full-caps'
                };
            }
            
            if (Object.keys(updates).length > 0) {
                chrome.storage.local.set(updates, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error setting default configurations:', chrome.runtime.lastError);
                    } else {
                        console.log('Added default configurations for upgraded extension');
                    }
                });
            }
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // The popup will open automatically due to manifest configuration
    console.log('Extension icon clicked');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getWordCategories') {
        chrome.storage.local.get(['wordCategories'], (result) => {
            sendResponse({ wordCategories: result.wordCategories || {} });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getConfigurations') {
        chrome.storage.local.get(['timestampConfig', 'captionConfig'], (result) => {
            sendResponse({ 
                timestampConfig: result.timestampConfig || {},
                captionConfig: result.captionConfig || {}
            });
        });
        return true; // Keep message channel open for async response
    }
});

function getPreloadedWords() {
    return {
        'U_Language': ['damn', 'damned', 'damning', 'dammit', 'dayum', 'daayum', 'goddammit', 'hell', 'helled', 'hellhole', 'hell-', 'god', 'godded', 'gawd', 'goddammit', 'godd*mn', 'jesus', 'jsus', 'jesus chrst', 'christ', 'christed', 'chrst', 'jeezus chrst', 'chr***', 'butt', 'butted', 'butting', 'b**', 'buttocks', 'buttock', 'bum', 'bummed', 'bumming', 'bumhole', 'bleeding', 'bleedin', 'blooming', 'bloomin', 'flipping', 'flippin', 'scumbag', 'scumbags', 'pillock', 'pillocked', 'screw', 'screwed', 'screwing', 'jerk', 'jerked', 'jerking', 'j***', 'jerkoff', 'jerk-', 'goddamn', 'freaking out', 'freaked out', 'freaking-', 'freaked-', 'fudging'],

        'PG_Language': ['bloody', 'bugger', 'buggered', 'buggering', 'buggery', 'shit', 'shat', 'shitting', 'shits', 'shite', 's***', 'sh*t', 'arsehole', 'arseholed', 'asshole', 'assholed', 'ahole', 'a*hole', 'arse', 'arsed', 'arsing', 'a*', 'arsehole', 'smartarse', 'ass', 'assed', 'assing', 'a*s', 'a**', 'asshole', 'smartass', 'tart', 'tarted', 'tosser', 'bastard', 'bastarded', 'b*******', 'basterd', 'bollocks', 'bollocked', 'b******', 'balls', 'b*llocks', 'frig', 'frigged', 'frigging', 'frick', 'fricking', 'frickin', 'friggin', 'piss', 'pissed', 'pissing', 'p***', 'crap', 'crapped', 'crapping', 'sod', 'sodded', 'sodding', 'git', 'gitted', 'balls', 'balled', 'balling', 'gobshite', 'gobshited', 'gob', 'tits', 'titties', 't***', 't**s', 'turd', 'turds', 'cock', 'cocked', 'cocking', 'cocks', 'hussy', 'hussies', 'bullshit', 'bullshits', 'bullsh*t', 'bullcrap', 'shi-', 'sh-ting', 'sh--ing', 'sh--', 'sh--ed', 'freaking', 'freakin', 'freak off', 'freakoff', 'freak-', 'fudge', 'screw you', 'fricked', 'frick-', 'crappy', 'crapping', 'craped'],

        '12_Language': ['prick', 'pricking', 'wanker', 'w*****', 'twat', 'twatted', 't***', 't**t', 'punani', 'punanis', 'p*****', 'p****i', 'whore', 'whored', 'whoring', 'whores', 'w****', 'w**re', 'bitch', 'bitched', 'bitching', 'bitches', 'biatch', 'b****', 'b*tch', 'slag', 'pussy', 'pussies', 'p****', 'p***y', 'fanny', 'f***y', 'cock', 'cocked', 'cocking', 'cocks', 'c***', 'knob', 'knobhead', 'knobbing', 'k***', 'slut', 'slutting', 'sluts', 's***', 's**t', 'slag', 'slagged', 'slagging', 'dickhead', 'dickheaded', 'd*******', 'd*ckhead', 'dick', 'dicked', 'dicking', 'd***', 'mofo', 'MF', 'motherf','bleep'],

        '15_Language': ['motherfucker', 'motherfuckers', 'm***********', 'mutha-', 'muthafucka', 'mutha..', 'mother.', 'mother-', 'mother#', 'mother*', 'cocksucker', 'cocksucked', 'cocksucking', 'c*********', 'motherfuck', 'motherfuckin', 'motherfucking', 'mother fucking', 'cocksuck', 'cocksucka', 'c u next tuesday', 'c.u.n.t', 'see you next tuesday', 'cunt', 'c***', 'the c-word', 'c*cksucker', 'cocksuckin', 'cocksuckin', 'cocksucker', 'motherfuck', 'motherfucked', 'm*********', 'motherfuckin', 'motherfucking', 'muthafucking', 'muthafuckin', 'cunt', 'cunted', 'c***', 'the c-word', 'c u n t'],

        '18_Language': ['cunt', 'cunted', 'c***', 'c.u.n.t', 'c u n t'],

        'U_Discrimination': ['bender', 'bent', 'bum', 'b*m', 'chink', 'chinked', 'ching chong', 'coloured', 'colored', 'cracker', 'crackered', 'honkey', 'honky', 'darkie', 'darky', 'darkey', 'dyke', 'dyked', 'fag', 'fagged', 'f**', 'f*g', 'faggot', 'faggoted', 'f**got', 'fairy', 'fairied', 'f**ry', 'gay', 'gayed', 'g*y', 'gaylord', 'gaylords', 'g**lord', 'gypsy', 'gypsied', 'hobo', 'hobos', 'homo', 'homos', 'jap', 'nip', 'jappo', 'kraut', 'krauted', 'midget', 'midgets', 'monkey', 'monkeys', 'nancy', 'nancies', 'negro', 'negros', 'pansy', 'pansies', 'queen', 'queened', 'queer', 'queered', 'queering', 'q****', 'q***r', 'spastic', 'spastics', 'spaz', 'spook', 'tramp', 'tramped', 'tramping', 'gays', 'queers', 'freak', 'freaks'],

        'PG_Discrimination': ['batty boy', 'b*y boy', 'b** boy', 'battyman', 'fag hag', 'f** hag', 'f*g h**', 'fag-hag', 'gypo', 'gypoed', 'half-breed', 'half-bred', 'half-caste', 'half-casted', 'jungle bunny', 'jungle bunnies', 'kike', 'kiked', 'k**', 'pikey', 'pikeys', 'poof', 'poofed', 'poofter', 'pooftered', 'shirtlifter', 'shirtlifted', 'slant-eye', 'slant-eyed', 'tranny', 'trannies', 't****', 'wog', 'wogs', 'bender', 'bent', 'bending', 'chink', 'chinked', 'ching chong', 'ch*nk', 'coloured', 'colored', 'cracker', 'crackered', 'honky', 'honkey', 'darkie', 'darky', 'darkey', 'dyke', 'dyked', 'd**e', 'fag', 'fagged', 'f**', 'f*g', 'faggot', 'fairy', 'fairied', 'gay', 'gayed', 'gaylord', 'gaylords', 'g**lord', 'gypsy', 'gypsied', 'gypo', 'homo', 'homos', 'h**o', 'jap', 'j*p', 'nip', 'jappo', 'midget', 'midgets', 'monkey', 'monkeys', 'nancy', 'nancies', 'negro', 'negros', 'pansy', 'pansies', 'queen', 'queened', 'queer', 'queered', 'q***r', 'spastic', 'spastics', 'spaz', 'spook', 'gays', 'queers', 'freak', 'freaks', 'bum', 'b*m'],

        '12_Discrimination': ['muff diver', 'muff dived', 'nigga', 'niggas', 'n****', 'n***a', 'niggah', 'niggha', 'niga', 'nigger', 'niggers', 'n*****', 'the n-word', 'nigga', 'niggress', 'neega', 'paki', 'pakis', 'retard', 'retarded', 'retarding', 'r******', 'r*****d', 'spaz', 'spazzed', 'spastic', 'batty boy', 'batty', 'b*y boy', 'b** boy', 'battyman', 'fag hag', 'f** hag', 'f*g h**', 'fag-hag', 'faggot', 'faggoted', 'f**got', 'gypo', 'gypoed', 'gypsy', 'jungle bunny', 'jungle bunnies', 'kike', 'kiked', 'k**', 'pikey', 'pikeys', 'poof', 'poofed', 'poofter', 'pooftered', 'shirtlifter', 'shirtlifted', 'slant-eye', 'slant-eyed', 'tranny', 'trannies', 't*****', 'wog', 'wogs', 'bender', 'bent', 'chink', 'chinked', 'ching chong', 'ch*nk', 'coloured', 'colored', 'cracker', 'crackered', 'honky', 'honkey', 'honkie', 'darkie', 'darky', 'darkey', 'dyke', 'dyked', 'd**e', 'fag', 'fagged', 'f**', 'f*g', 'faggot', 'fairy', 'fairied', 'gay', 'gayed', 'g*y', 'g**', 'gaylord', 'gaylords', 'g**lord', 'homo', 'homos', 'midget', 'midgets', 'monkey', 'monkeys', 'nancy', 'nancies', 'negro', 'negros', 'pansy', 'pansies', 'queen', 'queened', 'queer', 'queered', 'queering', 'q***r', 'spastic', 'spastics', 'spaz', 'spook', 'gays', 'queers', 'freak', 'freaks', 'bummer'],

        'U_Sex references': ['romance', 'romantic', 'pregnancy', 'cuddling', 'sharing a bed', 'boyfriend', 'girlfriend', 'cuddle', 'romances', 'boyfriends', 'girlfriends', 'reproduction', 'virgin mary', 'conception', 'dating', 'date', 'hot', 'smooch', 'smaker', 'kissing', 'kisses', 'kiss', 'pregnant', 'preggo', 'intimate', 'prego', 'harem', 'concubine'],

        'PG_Sex references': ['sleeping with', 'making love', 'going to bed with', 'virginity', 'having sex', 'getting lucky', 'making out', 'doing it', 'hooking up', 'sleeping', 'bodice-ripper', 'budgie-smugglers', 'ecchi', 'floozy', 'gagging', 'gigolo', 'escort', 'knockers', 'meat and two veg', 'pink', 'contraception', 'sexual touch', 'seminude', 'nude', 'naked', 'breast', 'boob', 'tit', 'butt', 'areola', 'nipple', 'skinny dipping', 'sexualised', 'intercourse', 'intimate relationship', 'sexual relationship', 'lovemaking', 'fornication', 'fling', 'promiscuity', 'hook up', 'sex', 'sexual activity', 'touch me', 'consenting adult', 'consensual sex', 'we slept together', 'we had sex', 'sleeping together', 'kiss', 'simping', 'upskert', 'nsfw', 'explicit', 'derobe', 'hookup', 'hook-up', 'slept with', 'virgin', 'sexy', 'cheat', 'cheating', 'cheated', 'affair', 'affairs', 'simp', 'teasing', 'sexually', 'sexual', 'mature content'],

        '12_Sex references': ['masturbate', 'masturbation', 'oral ', 'oral sex', 'giving head', 'fingering', 'lube', 'finger bang', 'finger-bang', 'orgasm', 'semen', 'spunk', 'jizz', 'come', 'cum', 'cumming', 'fetish', 'spanking', 'porn', 'sex work', 'whore', 'pimp', 'pimping', 'prostitute', 'hooker', 'ho', 'slut', 'slag', 'fuck', 'fucker', 'fucking', 'shagging', 'bang', 'banging', 'fuckin', 'fucked', 'sexting', 'erection', 'hung', 'jerkoff', 'jerk ', 'jerk-', 'jerking', 'pornograph', 'pornographic', 'pornography', 'shagged', 'back shot', 'boner', 'bum fun', 'butt plug', 'cockblock', 'finish first', 'fuckboy', 'furry', 'gag', 'gagging', 'gigolo', 'hentai', 'knee-trembler', 'nosh', 'randy', 'rentboy', 'rimjob', 'rimming', 'rim', 'blowjob', 'blow', 'handjob', 'hand job', 'bj', 's & m', 'scat', 'schlong', 'stiffy', 'swinger', 'wang', 'stiff', 'cuck', 'cuckold', 'butt-', 'butt ', 'buttsex', 'screwing', 'back shots', 'chewie', 'casting couch', 'cockblocker', 'vagina', 'infidelity', 'penis', 'vulva', 'pubic hair', 'starkers', 'sausage', 'hooters', 'melons', 'sixty nine', '69', 'ball sucking', 'boob grab', 'streakers', 'cock', 'g-spot', 'screwed', 'booty', 'hump', 'pelvic thrusting', 'doggy', 'pussy', 'breast job', 'thrusting', 'missionary position', 'cow girl', 'reverse cow girl', 'titty fuck', 'vaginal sex', 'paizuri', 'penetration', 'ass ', 'anal ', 'dry hump', 'humping', 'cunnilingus', 'boob suck', 'tribadism', 'grindin', 'queening', 'man milk', 'edging', 'wanker', 'love juice', 'roleplay', 'boink', 'moaning', 'panting', 'sex toys', 'pleasure point', 'g spot', 'felching', 'mastuwaiting', 'orgasmic', 'sploshing', 'wet', 'foreplay', 'hickey', 'labia', 'milf', 'rainbow kiss', 'swingers', 'hanky-panky', 'bulge', 'creampie', 'dirty talk', 'yoni', 'yoni massage', 'condom', 'rubber', 'playboy', 'playgirl', 'whore', 'erotic', 'arous', 'ejactulating', 'hard on', 'horny', 'blow job', 'ejaculate', 'ejaculation', 'puss', 'brothel', 'fornicating', 'wiener', 'clitoris', 'clit', 'crotch', 'vibrator', 'dildo', 'pantyhose', 'pounding', 'polygamy', 'polyamory', 'suck', 'morning wood', 'fondling', 'bdsm', 'kamasutra', 'arousal', 'striptease', 'strip tease', 'stripteasing', 'strip teasing', 'strip', 'fishnet stockings', 'onlyfans', 'pornstar', 'camgirl', 'camgirls', 'night walker', 'stripper', 'pole dance', 'lap dancer', 'lap dancing', 'lap dance', 'poledance', 'pole dancer', 'pole dancing', 'nightwalker', 'streetwalker', 'street walker', 'jerk it', 'moan', 'harlot', 'harlots', 'harloting', 'prostitution', 'footjob', 'affair', 'affairs', 'sensual', 'pleasure', 'happy ending', 'sucker', 'sucks', 'sucking', 'sucked', 'happy-ending', 'strip club', 'skank', 'wanked', 'wanking', 'wankoff', 'dilf', 'sugar daddy', 'sugar mommy', 'sugar daddies', 'sugar dad', 'masturbating', 'playmate', 'seductive', 'seduce', 'seduction', 'seduced', 'seducing', 'orgy'],

        '15_Sex references': ['fisting', 'gangbang', 'gang bang', 'gang-bang', 'necrophilia', 'incest', 'beastiality', 'bestiality', 'bdsm', 'urolagnia', 'choking', 'pornography', 'porn', 'pornograph', 'pornographic', 'bondage', 'cuck', 'cuckold', 'rimjob', 'rimming', 'rim', 's & m', 'scat', 'hentai', 'gunt', 'gag furry', 'dp', 'butt plug', 'butt fuck', 'butt fucked', 'rim job', 'fellatio', 'face fucking', 'breast licking', 'breast mouthing', 'kink', 'deep throating', 'pegging', 'squirting', 'rough sex', 'threesome', 'foursome', 'deflowering', 'sadomasochism', 'kama sutra', 'teen ag', 'blind fold', 'dominatrix', 'dominatric', 'pornhub', 'jerkmate', 'bukkake', 'pornstar', 'pornsite', 'glory hole', 'gloryhole', 'porno', 'porn star', 'porn sites', 'porn-sites', 'porn-site', 'porn site', 'edgemaxxing', 'goon', 'gooning', 'goonmaxxing', 'edge-maxxing', 'atm', '-porn', 'non-consensual'],

        '15_Sexual violence': ['underage', 'harassment', 'sexual violence', 'non-consensual sexual activity', 'sexual threat', 'marital rape', 'pedophile', 'molest', 'forced sex', 'child pornography', 'force him on her', 'force them on her', 'force her on her', 'force him on him', 'force them on him', 'force them on them', 'rape', 'raped', 'rapist', 'raping', 'rapin', 'harass', 'eve teasing', 'eve-teasing', 'cyberbullying', 'manipulation', 'pedophilia', 'pedo', 'paedo', 'grooming', 'molestation', 'molested', 'molester', 'molesting', 'sexually assaulted', 'sexual assault', 'sex trafficked', 'trafficker', 'trafficked', 'traffickers', 'harassed', 'sexually violated', 'sexually abused', 'abuser', 'abused', 'sodomized', 'sodomy', 'unsolicited', 'groping', 'groped', 'trafficking', 'blackmail', 'blackmailing', 'blackmailed', 'coerced', 'coercing', 'stalking', 'stalker', 'stalked', 'revenge porn', 'revenge-porn', 'gangrape', 'gangraped', 'gangrapes', 'gangraping', 'child-abuse', 'child abuse', 'coercion', 'offender'],

        'U_Drugs': ['smoking', 'smokes', 'vaping', 'vapes', 'pipe', 'tobacco', 'nicotine', 'cigar', 'cigarette', 'e-cigarette', 'e-cigar', 'alcohol', 'beer', 'whiskey', 'rum', 'champagne', 'vodka', 'wine', 'ale', 'gin', 'tequila', 'mezcal', 'brandy', 'cognac', 'armagnac', 'liqueurs', 'cocktails', 'cider', 'sake', 'toddy', 'kombucha', 'opium wars', 'cigarettes', 'stogy', 'stogie'],

        'PG_Drugs': ['sedative', 'painkillers', 'pain pills', 'pain pill', 'paracetamol', 'caugh syrup', 'narcotic', 'narcotics', 'drug dealer', 'drug traffic', 'drug', 'addiction', 'addicted', 'addict', 'prescribed', 'prescription', 'caugh drink', 'drugged', 'illegal substance', 'illegal substances', 'controlled substances', 'overdose', 'od', 'over dose', 'dosage', 'doseover', 'dose over', 'get high', 'getting high', 'tripping', 'weed', 'marijuana', 'weed', 'cannabis', 'hash', 'bhang', 'gummies', 'mushrooms', 'hookha', 'hookah', 'rehabilitation', 'relapse', 'relapsed', 'relapsing', 'rehabilitated', 'rehabilitating', 'cannabinoids', 'lysergic acid diethylamide', 'cathinones', 'psychoactive', 'valium', 'diazepam', 'ativan', 'lorazepam', 'alprazolam', 'hydrocodone', 'ritalin', 'ambien', 'barbiturates', 'acetone', 'toluene', 'wasted', 'rolling paper', 'rolling-paper', 'withdrawal', 'bong', 'syringe', 'hallucinogens', 'snuff blade', 'kava', 'vape', 'opm', 'paraphernalia', 'candyflip', 'ganja', 'stash', 'dope', 'inhaling', 'joint', 'blunt', 'crackcocaine', 'cocainecrack', 'drugs', 'sedation'],

        '12_Drugs': ['smack', 'cocaine', 'heroin', 'brown', 'fentanyl', 'oxycontin', 'oxycodone', 'oxy', 'opium', 'opiates', 'opiate', 'coke', 'charlie', 'blow', 'ketamine', 'coco', 'crack', 'meth', 'methamphetamine', 'speed', 'crack-cocaine', 'amphetamine', 'crystal meth', 'crystal meth', 'crystalmeth', 'rocks', 'lsd', 'acid', 'hallucinogens', 'ayahuasca', 'peyote', 'marijuana', 'weed', 'cannabis', 'hash', 'grass', 'pot', 'ganja', 'gummies', 'edibles', 'psilocybin', 'magic shrooms', 'shroom', 'shrooms', 'magic mushrooms', 'mushroom', 'magic mushroom', 'magic shroom', 'brownie', 'ecstacy', 'mdma', 'molly', 'pills', 'perc', 'percocet', 'acetaminophen', 'opioid', 'prescription', 'pain reliever', 'pain pill', 'pain pills', 'sleeping pills', 'sleeping pill', 'syrup', 'lean', 'roophies', 'solvents', 'aerosol', 'amyl nitrate', 'poppers', 'painkillers', 'painkiller', 'adderall', 'xanny', 'xany', 'xanax', 'rohypnol', 'roofies', 'benzodiazepine', 'quaaludes', 'laughing gas', 'nitrous oxide', 'whippets', 'whippits', 'whip-its', 'purple drank', 'purple-drank', 'promethazine', 'sizzurp', 'codeine', 'snorting', 'injecting', 'inject', 'snort', 'high', 'tripping', 'hashish', 'bath salts', 'cannabinoids', 'lysergic acid diethylamide', 'cathinones', 'psychoactive', 'valium', 'diazepam', 'ativan', 'lorazepam', 'alprazolam', 'hydrocodone', 'ritalin', 'ambien', 'barbiturates', 'acetone', 'toluene', 'reefer'],
        
        'U_Racial language': ['colored', 'coloured'],

        'PG_Racial language': ['negro', 'colored', 'coloured'],
        
        '12_Racial language': ['nigga', 'niggas', 'n****', 'n***a', 'niggah', 'niggha', 'niga', 'nigger', 'niggers', 'n*****', 'the n-word', 'nigga', 'niggress', 'neega'],

        // Special category for F-word variants (handled dynamically)
        'SPECIAL_F_WORDS': ['fuck', 'fuckin', 'fucked', 'fucking', 'fucker', 'fuckers', 'fucks', 'fuckoff', 'fuck-', 'fuckinhell', 'fuckup', '----', '----ing', '----ed', '----ers', '----in', '****', '****in', '****ing', '****ed', '----off', '****off', '*******', '******', '____ing', '____ed', '____', '____in', '____off', 'bleep', 'feck', 'feckoff', 'feckin', 'fecking', 'fecked', 'phuck', 'phucking', 'phucked', 'phuckin', 'f***', 'f***ing', 'f***in', 'f---ing', 'f---', 'f---ed', 'eff', 'effed', 'effin', 'effing', 'f word', 'fuc', 'fucin', 'the f', 'omfg', 'wtf', 'mf', 'f no', 'stfu', 'snafu', 'fecks', 'fook', 'fookin', 'fookup', 'fooked', 'fooking', 'fooks', 'effu', 'fu', 'f u', 'f up', 'f-off','f off']
    };
}