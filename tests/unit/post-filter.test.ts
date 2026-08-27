import { shouldSkipPost } from '../../lib/post-filter'

/**
 * Канал @web_vacancy — источник вакансий для сайта. С 25.08.2026 в него же
 * начали публиковать анонсы статей самого сайта, и парсер завёл на них
 * карточки вакансий: `chitayte-nashu-statyu_1740`, `_1766`, `_1774`.
 * Все три удалены 27.08.2026, правило ниже держит, чтобы не вернулись.
 *
 * Фикстуры — сырой HTML текстового блока с живой страницы t.me/s/web_vacancy,
 * снят 27.08.2026. Разобранный текст здесь не годится: домен живёт в атрибуте
 * href, а парсер срезает теги раньше любой проверки.
 */

/** Анонс статьи. Ссылка на d-pub.ru — на якоре, в видимом тексте её нет. */
const ANONS_1774 =
  'Читайте нашу статью<i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/F09F9187F09F8FBC.png\')"><b>👇🏼</b></i><br/><a href="https://d-pub.ru/articles/gde-razmeshchat-vakansii-ploshchadki-ceny-2026" target="_blank" rel="noopener" onclick="return confirm(\'Open this link?\\n\\n\'+this.href);">&quot;Где размещать вакансии: площадки и цены 2026&quot;</a>'

/** Второй анонс, другая обёртка: заголовок в <b>, текст ссылки в <i>. */
const ANONS_1766 =
  '<b>Читайте нашу статью<i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/F09F9187F09F8FBC.png\')"><b>👇🏼</b></i>: </b><br/><a href="https://d-pub.ru/articles/menedzher-marketpleysov-s-nulya" target="_blank" rel="noopener" onclick="return confirm(\'Open this link?\\n\\n\'+this.href);"><i>&quot;Менеджер маркетплейсов с нуля: обязанности и зарплата&quot;</i></a>'

/** Настоящая вакансия директолога с той же страницы: ссылка ведёт на forms.gle. */
const VAKANSIYA_1773 =
  '<a href="?q=%23%D0%94%D0%98%D0%A0%D0%95%D0%9A%D0%A2%D0%9E%D0%9B%D0%9E%D0%93">#ДИРЕКТОЛОГ</a><br/><br/><b><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/F09F92AC.png\')"><b>💬</b></i></b> <b>Директолог — Резиденция Качественного Трафика<br/>8 000₽+ за проект · удалёнка<br/></b><br/>Рекламное агентство, работает с медицинскими клиниками и B2B проектами более 5 лет<br/>Нужен специалист с опытом работы в сфере рекламы от 6 месяцев, кейсами с цифрами, умением работать со стратегиями и Яндекс Метрикой<br/><br/><b><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/F09F93A9.png\')"><b>📩</b></i></b> Контакт: <a href="https://forms.gle/we3hsbqmfoj2bpx29" target="_blank" rel="noopener">https://forms.gle/we3hsbqmfoj2bpx29</a><br/><br/><b><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29E96.png\')"><b>➖</b></i></b><br/><b><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/F09F93A3.png\')"><b>📣</b></i></b> Разместить вакансию / рекламу<br/><b><i class="emoji" style="background-image:url(\'//telegram.org/img/emoji/40/E29AA1.png\')"><b>⚡️</b></i></b> Получать больше вакансий быстрее: «Работодром PRO»'

describe('отсев постов канала', () => {
  it('анонс статьи со ссылкой на d-pub.ru не проходит', () => {
    const v = shouldSkipPost(ANONS_1774)
    expect(v.skip).toBe(true)
    expect(v.reason).toContain('d-pub.ru')
  })

  it('второй анонс, с другой вёрсткой, тоже не проходит', () => {
    expect(shouldSkipPost(ANONS_1766).skip).toBe(true)
  })

  it('настоящая вакансия проходит', () => {
    // Здесь важна не только сама вакансия, но и то, что ссылка на чужой
    // домен (forms.gle) правило не смущает.
    expect(shouldSkipPost(VAKANSIYA_1773).skip).toBe(false)
  })

  it('ловит домен в превью ссылки за пределами текстового блока', () => {
    // Telegram рисует превью отдельным узлом. Если анонс опубликуют без
    // якоря, домен окажется только там — поэтому проверяем весь блок.
    const block =
      '1780"<div class="tgme_widget_message_text">Свежий разбор</div>' +
      '<a class="tgme_widget_message_link_preview" href="https://d-pub.ru/articles/x"></a>'
    expect(shouldSkipPost(block).skip).toBe(true)
  })

  it('не путает наш домен с похожим чужим', () => {
    // Без границы слева правило выбросило бы живую вакансию работодателя
    // с таким доменом. Проверяем, что дефис слева не считается границей.
    expect(shouldSkipPost('<a href="https://super-d-pub.ru/jobs">вакансия</a>').skip).toBe(false)
  })

  it('ловит домен, написанный текстом без протокола', () => {
    expect(shouldSkipPost('Подробнее на www.d-pub.ru/articles').skip).toBe(true)
    expect(shouldSkipPost('Читайте d-pub.ru').skip).toBe(true)
  })
})
