// Модель для всех вызовов агентского CLI внутри завода.
//
// Задавать её явно обязательно. Без --model дочерний процесс берёт модель из
// глобального ~/.claude/settings.json, и правка этого файла 13.08.2026 молча
// перевела завод на другую модель — заметили только по расходу лимитов.
//
// Значение общее на writer, analyst и regen: разъехавшиеся модели дают
// несравнимые прогоны, а искать забытый вызов приходится по транскриптам.
//
// Замер 21.08.2026 на однотипных темах: opus-5 прошёл всю цепочку за 93 хода
// ассистента против 167 у fable-5 и оказался легче по весу сессий. Ходы здесь
// и есть расход — каждый тащит в API накопленный контекст.

/**
 * Модель по умолчанию для каждого CLI.
 *
 * Модели у Claude и Codex названы по-разному и невзаимозаменяемы. Пока
 * значение было одно на всех, откат с одного CLI на другой был бесполезен:
 * второй получал чужое имя модели и падал следом. 28.08.2026 завод так и
 * встал — `gpt-5.6-sol` в .env, а установленный codex-cli 0.130.0 отвечает
 * 400 «requires a newer version of Codex».
 */
const DEFAULT_MODEL: Record<string, string> = {
  claude: 'claude-opus-5',
  // Не gpt-5.5: у неё в каталоге моделей multi_agent_version = null, то есть
  // субагенты и роли недоступны. У gpt-5.6-sol — v2. Заводу это критично:
  // именно ролью передаётся dpub-content-standard.
  codex: 'gpt-5.6-sol',
}

/**
 * Модель для конкретного CLI.
 *
 * CONTENT_FACTORY_MODEL остаётся ручным переключателем, но применяется только
 * к тому CLI, для которого задан: имя модели Codex, подставленное в Claude,
 * роняет запуск ровно так же, как и наоборот. Для второго CLI берётся его
 * умолчание — иначе откат не спасает, а удваивает падение.
 */
export function modelFor(cli: string): string {
  const explicit = process.env.CONTENT_FACTORY_MODEL
  const explicitCli = process.env.CONTENT_FACTORY_CLI
  if (explicit && (!explicitCli || explicitCli === cli)) return explicit
  return DEFAULT_MODEL[cli] ?? DEFAULT_MODEL.claude
}

/** Модель текущего CLI. Оставлено ради вызовов, которым выбор не нужен. */
export const FACTORY_MODEL = modelFor(process.env.CONTENT_FACTORY_CLI || 'claude')
