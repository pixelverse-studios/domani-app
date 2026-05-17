import {
  getThemeBreakdown,
  inferDayType,
  inferDayTypeWithTranslations,
} from '../dayTypeInference'
import { buildSystemCategory, buildTaskWithCategory, buildUserCategory } from '~/test/factories'

describe('day type inference', () => {
  it('defaults empty days to balanced', () => {
    expect(inferDayType([]).theme).toBe('balanced')
  })

  it('uses the dominant system category theme when one theme is more than half of tasks', () => {
    const workCategory = buildSystemCategory({ id: 'work', name: 'Work' })
    const wellnessCategory = buildSystemCategory({ id: 'wellness', name: 'Wellness' })

    const result = inferDayType([
      buildTaskWithCategory({ id: '1', system_category: workCategory }),
      buildTaskWithCategory({ id: '2', system_category: workCategory }),
      buildTaskWithCategory({ id: '3', system_category: wellnessCategory }),
    ])

    expect(result.theme).toBe('work')
    expect(result.title).toBe('Productivity Day')
  })

  it('falls back to balanced when category themes are evenly mixed', () => {
    const result = inferDayType([
      buildTaskWithCategory({
        id: 'work',
        system_category: buildSystemCategory({ id: 'work', name: 'Work' }),
      }),
      buildTaskWithCategory({
        id: 'wellness',
        system_category: buildSystemCategory({ id: 'wellness', name: 'Wellness' }),
      }),
      buildTaskWithCategory({
        id: 'home',
        system_category: buildSystemCategory({ id: 'home', name: 'Home' }),
      }),
    ])

    expect(result.theme).toBe('balanced')
  })

  it('maps user category keywords to broader themes', () => {
    const result = inferDayType([
      buildTaskWithCategory({
        id: 'study',
        system_category: null,
        user_category: buildUserCategory({ id: 'study', name: 'Study plan' }),
      }),
      buildTaskWithCategory({
        id: 'course',
        system_category: null,
        user_category: buildUserCategory({ id: 'course', name: 'Course notes' }),
      }),
      buildTaskWithCategory({
        id: 'errand',
        system_category: null,
        user_category: buildUserCategory({ id: 'errand', name: 'Errands' }),
      }),
    ])

    expect(result.theme).toBe('learning')
  })

  it('uses translated day theme copy when provided', () => {
    const result = inferDayTypeWithTranslations(
      [
        buildTaskWithCategory({
          id: 'wellness-1',
          system_category: buildSystemCategory({ id: 'wellness', name: 'Wellness' }),
        }),
      ],
      {
        work: { title: 'Work translated', subtitle: 'Work subtitle' },
        wellness: { title: 'Wellness translated', subtitle: 'Wellness subtitle' },
        personal: { title: 'Personal translated', subtitle: 'Personal subtitle' },
        learning: { title: 'Learning translated', subtitle: 'Learning subtitle' },
        balanced: { title: 'Balanced translated', subtitle: 'Balanced subtitle' },
      },
    )

    expect(result).toMatchObject({
      theme: 'wellness',
      title: 'Wellness translated',
      subtitle: 'Wellness subtitle',
    })
  })

  it('returns sorted theme breakdown percentages', () => {
    const breakdown = getThemeBreakdown([
      buildTaskWithCategory({
        id: 'work-1',
        system_category: buildSystemCategory({ id: 'work', name: 'Work' }),
      }),
      buildTaskWithCategory({
        id: 'work-2',
        system_category: buildSystemCategory({ id: 'work', name: 'Work' }),
      }),
      buildTaskWithCategory({
        id: 'personal',
        system_category: buildSystemCategory({ id: 'home', name: 'Home' }),
      }),
    ])

    expect(breakdown[0]).toMatchObject({ theme: 'work', count: 2, percentage: 67 })
    expect(breakdown.find((entry) => entry.theme === 'personal')).toMatchObject({
      count: 1,
      percentage: 33,
    })
  })
})
