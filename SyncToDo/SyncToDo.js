// 同步当月的任务到日历
const moment = require("moment");
const main = async () => {
  let res = await $reminder.fetch({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
  })
  /**
   * 获取有alarmDate的任务，只有指定了提醒日期、时间的，才能知道什么时候是结束日期
   */
  const reminderList = res.events.filter(item => { 
    return item.alarmDate
  })

  const reminderMap = new Map()
  for (let item of reminderList) {
    if (reminderMap.has(item.title)) {
      reminderMap.get(item.title).push(item)
    } else {
      reminderMap.set(item.title, [item])
    }
  }

  /**
   * 获取日历项
   */
  const calendarRes = await $calendar.fetch({
    startDate: moment().startOf('month').toDate(),
    endDate: moment().endOf('month').toDate(),
  });
  const calendarMap = new Map()

  calendarRes.events.forEach(item => {
    const title = item.title
    if (calendarMap.has(title)) {
      calendarMap.get(title).push(item)
    } else {
      calendarMap.set(title, [item])
    }
  })

  async function createCalendar(reminderItem) {
    let eventObj = {
      title: reminderItem.title,
      notes: reminderItem.notes ? `${reminderItem.notes}\nid: ${reminderItem.identifier}` : `id: ${reminderItem.identifier}`,
      startDate: reminderItem.alarmDate,
      endDate: reminderItem.alarmDate,
    }
    if (reminderItem.completed) {
      eventObj.startDate = reminderItem.completionDate
      eventObj.endDate = moment(reminderItem.completionDate).add(1, 'hour').toDate()
    }
    await $calendar.create(eventObj);
  }


  ;[...reminderMap.keys()].forEach(async reminderTitle => {
    const reminderItemList = reminderMap.get(reminderTitle)
    for (let reminderItem of reminderItemList) {
      const title = reminderItem.title
      // 如果日历里不存在，那么就写入
      if (!calendarMap.has(title)) {
        await createCalendar(reminderItem)
      } else {
        // 如果日历里存在，那么就检查是否需要更新
        const calendarList = calendarMap.get(title)
        let findTarget = false
        for (let calendar of calendarList) {
          // 根据ID确定具体的提醒事项
          if (calendar.notes && calendar.notes.includes(reminderItem.identifier)) {
            findTarget = true
            // 如果顺利完成
            if (reminderItem.completed) {
              calendar.startDate = reminderItem.completionDate
              calendar.endDate = moment(reminderItem.completionDate).add(1, 'hour').toDate()
            }
            await $calendar.save({
              event: calendar
            });
          }
        }
        // 没有找到对应的id，说明日历列表里有这个title的列表里也不存在这个提醒事项
        // 重新创建
        if (!findTarget) {
          await createCalendar(reminderItem)
        }
      }
    }
  })
}

main()
