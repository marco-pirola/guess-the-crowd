/**
 * Flat, prefixed translation keys instead of nested objects — keeps `keyof typeof en`
 * a simple type-safe key union without recursive key-path typing.
 *
 * Question/answer text from the seed pool is NOT covered here — each
 * question carries its own textIt/optionAIt/optionBIt fields, applied via
 * localizeQuestion() (see src/lib/i18n/localizeQuestion.ts).
 */
export const en = {
  // Navigation / header
  nav_ariaLabel: "Main navigation",
  nav_leaderboard: "Leaderboard",

  // Home page
  home_tagline: "A daily prediction game",
  home_title: "Guess the Crowd",
  home_subtitle: "Not what's right — what everyone else will pick.",
  home_playToday: "Play today",
  home_howItWorks: "How it works",
  home_step1Title: "Predict",
  home_step1Body: "Read the question and guess what percentage of the crowd will pick each answer.",
  home_step2Title: "Choose",
  home_step2Body: "Lock your prediction, then — only then — answer the question yourself.",
  home_step3Title: "Reveal",
  home_step3Body: "See how the crowd actually answered, and how close your read was.",

  // Onboarding
  onboarding_title: "Can you read the crowd?",
  onboarding_body: "Predict what percentage of people will choose each answer. Then make your own choice and see how close you were.",
  onboarding_cta: "Got it — let's play",

  // Game flow
  game_loadingQuestion: "Loading question…",
  game_challenge: "Challenge #{n}",
  game_predictPrompt: "How do you think everyone else will choose?",
  game_sliderLabel: "Predicted split between {optionA} and {optionB}",
  game_predictingLine: "You're predicting {pctA}% {optionA} · {pctB}% {optionB}",
  game_lockPrediction: "Lock prediction",
  game_locking: "Locking…",
  game_nowChoose: "Now make your choice",
  game_forgetCrowd: "Forget the crowd. What would YOU choose?",
  game_predictError: "Couldn't lock your prediction. Try again.",
  game_voteError: "Couldn't submit your vote. Try again.",
  game_resultError: "Couldn't load the result. Try again.",
  game_nextError: "Couldn't load the next question. Try again.",
  game_offlineError: "Couldn't reach the server. Check your connection and try again.",
  game_loadError: "Couldn't load this question. Try again.",

  // Result screen
  result_msgIncredible: "Incredible read.",
  result_msgGreat: "You read the crowd extremely well.",
  result_msgNice: "Nice read.",
  result_msgNotBad: "Not bad — you were close.",
  result_msgMisjudged: "You misjudged the crowd a bit.",
  result_msgMissed: "You completely missed the crowd.",
  result_theCrowd: "The crowd",
  result_yourPrediction: "Your prediction",
  result_youChoseLabel: "You chose",
  result_samePick: "Same pick as the crowd",
  result_differentPick: "You leaned the other way",
  result_spotOn: "Spot on!",
  result_pointsOffOne: "You missed the crowd by {n} point",
  result_pointsOffMany: "You missed the crowd by {n} points",
  result_score: "Score",
  result_percentile: "You predicted the crowd better than {pct}% of players.",
  result_seededNote: "Based on demo data — not enough real players yet.",
  result_liveNoteOne: "Based on {n} player.",
  result_liveNoteMany: "Based on {n} players.",
  result_nextQuestion: "Next question",
  result_advancing: "Loading…",

  // Share
  share_result: "Share result",
  share_linkCopied: "Link copied!",
  share_text: "I scored {score}/1000 predicting the crowd on Guess the Crowd. Can you beat me?",

  // Phase steps
  phase_predict: "Predict",
  phase_choose: "Choose",
  phase_reveal: "Reveal",
  phase_gameProgress: "Game progress",

  // Leaderboard
  leaderboard_title: "Leaderboard",
  leaderboard_subtitle: "Who reads the crowd best.",
  leaderboard_scoreExplainer: "Points earned for accurate predictions.",
  leaderboard_today: "Today",
  leaderboard_allTime: "All-time",
  leaderboard_loading: "Loading leaderboard…",
  leaderboard_noScoresTitle: "No scores yet",
  leaderboard_noScoresTodayDesc: "Be the first to play today.",
  leaderboard_noScoresAllDesc: "Play a challenge to appear on the leaderboard.",
  leaderboard_you: "(you)",
  leaderboard_colRank: "Rank",
  leaderboard_colPlayer: "Player",
  leaderboard_colScore: "Score",
  leaderboard_yourPosition: "#{rank} · {score} pts",
  leaderboard_overtake: "{diff} pts to overtake #{rank}",
  leaderboard_top: "You're on top",

  // Streak
  streak_dayOne: "day",
  streak_dayMany: "days",

  // Play / challenge routing
  play_finding: "Finding a question…",
  play_startError: "Couldn't start a new question. Try again.",
  challenge_loading: "Loading challenge…",
  challenge_loadError: "Couldn't load this challenge.",
  challenge_notFound: "This challenge doesn't exist.",
  challenge_playTodays: "Play today's challenge",

  // Generic
  common_tryAgain: "Try again",
  common_somethingWrong: "Something went wrong.",

  // Settings
  settings_language: "Language",
  settings_theme: "Theme",
  settings_light: "Light",
  settings_dark: "Dark",

  // Question categories
  category_Food: "Food",
  category_Movies: "Movies",
  category_Sport: "Sport",
  category_Technology: "Technology",
  category_School: "School",
  category_EverydayLife: "Everyday Life",
  category_Random: "Random",
  category_InternetCulture: "Internet Culture",

  // Profile setup (first time only)
  profile_setup_title: "Set up your player",
  profile_setup_body: "Pick a username and an avatar — you can change the avatar anytime.",
  profile_setup_usernameLabel: "Username",
  profile_setup_usernamePlaceholder: "e.g. QuickFox482",
  profile_setup_avatarLabel: "Avatar",
  profile_setup_cta: "Start playing",
  profile_setup_saving: "Saving…",

  // Profile button / menu
  profile_button_label: "Your profile",
  profile_menu_bestScore: "Best Score",
  profile_menu_gamesPlayed: "Games Played",
  profile_menu_questionsAnswered: "Questions Answered",
  profile_menu_globalRank: "Global Rank",
  profile_menu_globalRankValue: "#{rank}",
  profile_menu_avatarLabel: "Avatar",
  profile_menu_usernameLabel: "Username",
  profile_menu_changeUsername: "Change",
  profile_menu_saveUsername: "Save",
  profile_menu_cancel: "Cancel",
  profile_menu_cooldownNotice: "Username changes are available again in {days} days.",
  profile_menu_usernameTaken: "That username is taken.",
  profile_menu_usernameInvalid: "3-20 characters: letters, numbers, and underscores only.",
  profile_menu_updateError: "Couldn't save that. Try again.",
  profile_menu_close: "Close",
  profile_menu_saveProgressTitle: "Save your progress",
  profile_menu_saveProgressBody: "Keep your username, score, and stats when you change device or come back later.",
  profile_menu_continueWithGoogle: "Continue with Google",
  profile_menu_continueWithEmail: "Continue with email",
  profile_menu_emailLabel: "Email address",
  profile_menu_emailPlaceholder: "you@example.com",
  profile_menu_emailSend: "Send magic link",
  profile_menu_emailSent: "Check your email for a link to finish saving your progress.",
  profile_menu_progressSaved: "Your progress is saved to your Google account.",
  profile_menu_linkError: "Couldn't link your account. Try again.",
  profile_menu_linkErrorRetry: "Try again",

  // Daily Challenge
  daily_questionProgress: "Daily Challenge · Question {n}/{total}",
  daily_title: "Daily Challenge",
  daily_subtitle: "10 fixed questions — the same for everyone today.",
  daily_startCta: "Start today's challenge",
  daily_resumeCta: "Continue today's challenge",
  daily_finding: "Loading today's challenge…",
  daily_startError: "Couldn't load today's challenge. Try again.",
  daily_completedNotice: "Official score already recorded today.",
  daily_todaysScore: "Today's Score",
  daily_dailyRank: "Daily Rank",
  daily_playQuickPlay: "Play Quick Play",
  daily_replay: "Replay in practice mode",
  daily_leaderboardTitle: "Daily Leaderboard",
  daily_noResultsYet: "Nobody's played today's challenge yet.",
  daily_you: "(you)",

  // Home page — Quick Play vs Daily Challenge
  home_quickPlayTitle: "Quick Play",
  home_quickPlayBody: "Unlimited questions, forever.",
  home_dailyChallengeTitle: "Daily Challenge",
  home_dailyChallengeBody: "10 questions. Official score once per day.",
  home_playDaily: "Play Daily Challenge",
} as const;

export const it: Record<keyof typeof en, string> = {
  // Navigation / header
  nav_ariaLabel: "Navigazione principale",
  nav_leaderboard: "Classifica",

  // Home page
  home_tagline: "Un gioco di previsione quotidiano",
  home_title: "Guess the Crowd",
  home_subtitle: "Non cosa è giusto — cosa sceglieranno gli altri.",
  home_playToday: "Gioca ora",
  home_howItWorks: "Come funziona",
  home_step1Title: "Prevedi",
  home_step1Body: "Leggi la domanda e indovina che percentuale della folla sceglierà ogni risposta.",
  home_step2Title: "Scegli",
  home_step2Body: "Blocca la tua previsione, poi — solo dopo — rispondi tu stesso alla domanda.",
  home_step3Title: "Scopri",
  home_step3Body: "Scopri come ha risposto davvero la folla e quanto sei stato preciso.",

  // Onboarding
  onboarding_title: "Sai leggere la folla?",
  onboarding_body: "Prevedi che percentuale di persone sceglierà ogni risposta. Poi scegli la tua e scopri quanto ci sei andato vicino.",
  onboarding_cta: "Ho capito — si gioca",

  // Game flow
  game_loadingQuestion: "Caricamento domanda…",
  game_challenge: "Sfida n. {n}",
  game_predictPrompt: "Come pensi che sceglieranno gli altri?",
  game_sliderLabel: "Divisione prevista tra {optionA} e {optionB}",
  game_predictingLine: "Stai prevedendo {pctA}% {optionA} · {pctB}% {optionB}",
  game_lockPrediction: "Blocca previsione",
  game_locking: "Blocco in corso…",
  game_nowChoose: "Ora scegli tu",
  game_forgetCrowd: "Dimentica la folla. Tu cosa sceglieresti?",
  game_predictError: "Non è stato possibile salvare la previsione. Riprova.",
  game_voteError: "Non è stato possibile registrare la tua scelta. Riprova.",
  game_resultError: "Non è stato possibile caricare il risultato. Riprova.",
  game_nextError: "Non è stato possibile caricare la prossima domanda. Riprova.",
  game_offlineError: "Impossibile raggiungere il server. Controlla la connessione e riprova.",
  game_loadError: "Non è stato possibile caricare questa domanda. Riprova.",

  // Result screen
  result_msgIncredible: "Lettura incredibile.",
  result_msgGreat: "Hai letto la folla benissimo.",
  result_msgNice: "Bella lettura.",
  result_msgNotBad: "Non male — ci sei andato vicino.",
  result_msgMisjudged: "Hai sottovalutato un po' la folla.",
  result_msgMissed: "Hai completamente sbagliato la folla.",
  result_theCrowd: "La folla",
  result_yourPrediction: "La tua previsione",
  result_youChoseLabel: "Hai scelto",
  result_samePick: "Stessa scelta della folla",
  result_differentPick: "Hai pensato diversamente",
  result_spotOn: "Hai indovinato!",
  result_pointsOffOne: "Hai mancato la folla di {n} punto",
  result_pointsOffMany: "Hai mancato la folla di {n} punti",
  result_score: "Punteggio",
  result_percentile: "Hai previsto la folla meglio del {pct}% dei giocatori.",
  result_seededNote: "Dati dimostrativi — non ci sono ancora abbastanza giocatori reali.",
  result_liveNoteOne: "Basato su {n} giocatore.",
  result_liveNoteMany: "Basato su {n} giocatori.",
  result_nextQuestion: "Prossima domanda",
  result_advancing: "Caricamento…",

  // Share
  share_result: "Condividi risultato",
  share_linkCopied: "Link copiato!",
  share_text: "Ho totalizzato {score}/1000 prevedendo la folla su Guess the Crowd. Riesci a battermi?",

  // Phase steps
  phase_predict: "Prevedi",
  phase_choose: "Scegli",
  phase_reveal: "Scopri",
  phase_gameProgress: "Avanzamento partita",

  // Leaderboard
  leaderboard_title: "Classifica",
  leaderboard_subtitle: "Chi legge meglio la folla.",
  leaderboard_scoreExplainer: "Punti guadagnati per previsioni accurate.",
  leaderboard_today: "Oggi",
  leaderboard_allTime: "Sempre",
  leaderboard_loading: "Caricamento classifica…",
  leaderboard_noScoresTitle: "Ancora nessun punteggio",
  leaderboard_noScoresTodayDesc: "Sii il primo a giocare oggi.",
  leaderboard_noScoresAllDesc: "Gioca una sfida per comparire in classifica.",
  leaderboard_you: "(tu)",
  leaderboard_colRank: "Pos.",
  leaderboard_colPlayer: "Giocatore",
  leaderboard_colScore: "Punti",
  leaderboard_yourPosition: "#{rank} · {score} pt",
  leaderboard_overtake: "{diff} pt per superare #{rank}",
  leaderboard_top: "Sei in testa",

  // Streak
  streak_dayOne: "giorno",
  streak_dayMany: "giorni",

  // Play / challenge routing
  play_finding: "Ricerca di una domanda…",
  play_startError: "Non è stato possibile avviare una nuova domanda. Riprova.",
  challenge_loading: "Caricamento sfida…",
  challenge_loadError: "Non è stato possibile caricare questa sfida.",
  challenge_notFound: "Questa sfida non esiste.",
  challenge_playTodays: "Gioca la sfida di oggi",

  // Generic
  common_tryAgain: "Riprova",
  common_somethingWrong: "Qualcosa è andato storto.",

  // Settings
  settings_language: "Lingua",
  settings_theme: "Tema",
  settings_light: "Chiaro",
  settings_dark: "Scuro",

  // Question categories
  category_Food: "Cibo",
  category_Movies: "Film",
  category_Sport: "Sport",
  category_Technology: "Tecnologia",
  category_School: "Scuola",
  category_EverydayLife: "Vita quotidiana",
  category_Random: "Casuale",
  category_InternetCulture: "Cultura Internet",

  // Profile setup (first time only)
  profile_setup_title: "Crea il tuo profilo",
  profile_setup_body: "Scegli un username e un avatar — potrai cambiare l'avatar quando vuoi.",
  profile_setup_usernameLabel: "Username",
  profile_setup_usernamePlaceholder: "es. QuickFox482",
  profile_setup_avatarLabel: "Avatar",
  profile_setup_cta: "Inizia a giocare",
  profile_setup_saving: "Salvataggio…",

  // Profile button / menu
  profile_button_label: "Il tuo profilo",
  profile_menu_bestScore: "Miglior punteggio",
  profile_menu_gamesPlayed: "Partite giocate",
  profile_menu_questionsAnswered: "Domande risposte",
  profile_menu_globalRank: "Posizione globale",
  profile_menu_globalRankValue: "#{rank}",
  profile_menu_avatarLabel: "Avatar",
  profile_menu_usernameLabel: "Username",
  profile_menu_changeUsername: "Modifica",
  profile_menu_saveUsername: "Salva",
  profile_menu_cancel: "Annulla",
  profile_menu_cooldownNotice: "Potrai cambiare di nuovo username tra {days} giorni.",
  profile_menu_usernameTaken: "Questo username è già in uso.",
  profile_menu_usernameInvalid: "3-20 caratteri: solo lettere, numeri e underscore.",
  profile_menu_updateError: "Non è stato possibile salvare. Riprova.",
  profile_menu_close: "Chiudi",
  profile_menu_saveProgressTitle: "Salva i tuoi progressi",
  profile_menu_saveProgressBody: "Mantieni username, punteggio e statistiche quando cambi dispositivo o torni più tardi.",
  profile_menu_continueWithGoogle: "Continua con Google",
  profile_menu_continueWithEmail: "Continua con email",
  profile_menu_emailLabel: "Indirizzo email",
  profile_menu_emailPlaceholder: "tu@esempio.com",
  profile_menu_emailSend: "Invia link magico",
  profile_menu_emailSent: "Controlla la tua email per il link che completa il salvataggio.",
  profile_menu_progressSaved: "I tuoi progressi sono salvati nel tuo account Google.",
  profile_menu_linkError: "Non è stato possibile collegare l'account. Riprova.",
  profile_menu_linkErrorRetry: "Riprova",

  // Daily Challenge
  daily_questionProgress: "Sfida del giorno · Domanda {n}/{total}",
  daily_title: "Sfida del giorno",
  daily_subtitle: "10 domande fisse — le stesse per tutti oggi.",
  daily_startCta: "Inizia la sfida di oggi",
  daily_resumeCta: "Continua la sfida di oggi",
  daily_finding: "Caricamento della sfida di oggi…",
  daily_startError: "Non è stato possibile caricare la sfida di oggi. Riprova.",
  daily_completedNotice: "Punteggio ufficiale già registrato oggi.",
  daily_todaysScore: "Punteggio di oggi",
  daily_dailyRank: "Posizione del giorno",
  daily_playQuickPlay: "Gioca a Quick Play",
  daily_replay: "Rigioca in modalità pratica",
  daily_leaderboardTitle: "Classifica del giorno",
  daily_noResultsYet: "Nessuno ha ancora giocato la sfida di oggi.",
  daily_you: "(tu)",

  // Home page — Quick Play vs Daily Challenge
  home_quickPlayTitle: "Quick Play",
  home_quickPlayBody: "Domande illimitate, per sempre.",
  home_dailyChallengeTitle: "Sfida del giorno",
  home_dailyChallengeBody: "10 domande. Punteggio ufficiale una volta al giorno.",
  home_playDaily: "Gioca la sfida del giorno",
};

export type TranslationKey = keyof typeof en;
export type Locale = "en" | "it";

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, it };

export const LOCALE_LABELS: Record<Locale, string> = { en: "EN", it: "IT" };
