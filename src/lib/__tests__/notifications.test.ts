import * as Notifications from 'expo-notifications'

import { NotificationService } from '../notifications'

const mockCancelAll = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock

describe('NotificationService transition recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCancelAll.mockResolvedValue(undefined)
    mockSchedule.mockResolvedValueOnce('restored-planning').mockResolvedValueOnce('restored-task')
  })

  it('normalizes native iOS and Android triggers when restoring reminders', async () => {
    await expect(
      NotificationService.restoreScheduledNotifications([
        {
          identifier: 'old-planning',
          content: { title: 'Plan Tomorrow', data: { type: 'planning_reminder' } },
          trigger: {
            type: 'calendar',
            repeats: true,
            dateComponents: {
              hour: 21,
              minute: 15,
              timeZone: 'America/New_York',
              calendar: 'gregorian',
              isLeapMonth: false,
            },
          },
        },
        {
          identifier: 'old-task',
          content: {
            title: 'Task reminder',
            data: { type: 'task_reminder', taskId: 'task-1' },
          },
          trigger: { type: 'date', timestamp: 1_800_000_000 },
        },
      ]),
    ).resolves.toBe(true)

    expect(mockCancelAll).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenNthCalledWith(1, {
      content: { title: 'Plan Tomorrow', data: { type: 'planning_reminder' } },
      trigger: {
        type: 'calendar',
        repeats: true,
        timezone: 'America/New_York',
        hour: 21,
        minute: 15,
      },
    })
    expect(mockSchedule).toHaveBeenNthCalledWith(2, {
      content: {
        title: 'Task reminder',
        data: { type: 'task_reminder', taskId: 'task-1' },
      },
      trigger: { type: 'date', date: 1_800_000_000_000 },
    })
  })
})
