import type { GlobalConfig } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Navbar Global
 *
 * Seed values (from components/Navbar.tsx):
 *   slogan: "Место, где встречаются хорошие люди"
 *   menuItems:
 *     - { label: "Главная", url: "/" }
 *     - { label: "Вакансии", url: "/vacancies" }
 *     - { label: "Резюме", url: "/resumes" }
 *     - { label: "Статьи", url: "/articles" }
 */
export const Navbar: GlobalConfig = {
  slug: 'navbar',
  label: 'Navbar',
  fields: [
    {
      name: 'slogan',
      type: 'text',
      label: 'Слоган',
      required: false,
      admin: {
        description: 'Подпись под логотипом в шапке сайта',
      },
    },
    {
      name: 'menuItems',
      type: 'array',
      label: 'Пункты меню',
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Название',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          label: 'URL',
          required: true,
        },
        {
          name: 'submenu',
          type: 'array',
          label: 'Подменю',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Название',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'URL',
              required: true,
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      () => {
        revalidatePath('/', 'layout')
      },
    ],
  },
}
