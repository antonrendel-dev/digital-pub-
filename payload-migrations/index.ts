import * as migration_20260527_114908 from './20260527_114908'
import * as migration_20260530_seotext_to_text from './20260530_seotext_to_text'
import * as migration_20260530_articles_content_to_text from './20260530_articles_content_to_text'

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
]
