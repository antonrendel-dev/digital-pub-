import * as migration_20260527_114908 from './20260527_114908'
import * as migration_20260530_seotext_to_text from './20260530_seotext_to_text'
import * as migration_20260530_articles_content_to_text from './20260530_articles_content_to_text'
import * as migration_20260609_articles_image_url from './20260609_articles_image_url'
import * as migration_20260609_articles_image_upload from './20260609_articles_image_upload'
import * as migration_20260614_articles_tags from './20260614_articles_tags'
import * as migration_20260831_kontekstnaya_reklama_tag from './20260831_kontekstnaya_reklama_tag'
import * as migration_20260831_unpublish_telegram_duplicate from './20260831_unpublish_telegram_duplicate'

export const migrations = [
  {
    up: migration_20260527_114908.up,
    down: migration_20260527_114908.down,
    name: '20260527_114908',
  },
  {
    up: migration_20260530_seotext_to_text.up,
    down: migration_20260530_seotext_to_text.down,
    name: '20260530_seotext_to_text',
  },
  {
    up: migration_20260530_articles_content_to_text.up,
    down: migration_20260530_articles_content_to_text.down,
    name: '20260530_articles_content_to_text',
  },
  {
    up: migration_20260609_articles_image_url.up,
    down: migration_20260609_articles_image_url.down,
    name: '20260609_articles_image_url',
  },
  {
    up: migration_20260609_articles_image_upload.up,
    down: migration_20260609_articles_image_upload.down,
    name: '20260609_articles_image_upload',
  },
  {
    up: migration_20260614_articles_tags.up,
    down: migration_20260614_articles_tags.down,
    name: '20260614_articles_tags',
  },
  {
    up: migration_20260831_kontekstnaya_reklama_tag.up,
    down: migration_20260831_kontekstnaya_reklama_tag.down,
    name: '20260831_kontekstnaya_reklama_tag',
  },
  {
    up: migration_20260831_unpublish_telegram_duplicate.up,
    down: migration_20260831_unpublish_telegram_duplicate.down,
    name: '20260831_unpublish_telegram_duplicate',
  },
]
