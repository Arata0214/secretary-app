"use client";

import { useState, useEffect } from "react";
import styles from "./calendar.module.css";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    // /api/calendar (GET) はGoogleカレンダーから取得してキャッシュしてから返す
    const res = await fetch("/api/calendar");
    const data = await res.json();
    if (data.events) {
      setEvents(data.events);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const days = [];
  // previous month padding
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  // next month padding
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getEventsForDate = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    return events.filter(e => {
      const eStart = new Date(e.startTime);
      const eEnd = new Date(e.endTime);
      // イベントがこの日と重なるかどうか
      return eStart <= dayEnd && eEnd >= dayStart;
    });
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.monthTitle}>{year}年 {month + 1}月</h1>
        <div className={styles.navButtons}>
          <button className={styles.navBtn} onClick={prevMonth}>&lt; 前月</button>
          <button className={styles.navBtn} onClick={goToday}>今日</button>
          <button className={styles.navBtn} onClick={nextMonth}>次月 &gt;</button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {["日", "月", "火", "水", "木", "金", "土"].map(d => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {days.map((item, idx) => {
          const dayEvents = getEventsForDate(item.date);
          const cellClass = `${styles.dayCell} ${!item.isCurrentMonth ? styles.otherMonth : ""} ${isToday(item.date) ? styles.todayCell : ""}`;
          return (
            <div key={idx} className={cellClass} onClick={() => setSelectedDate(item.date)}>
              <div className={styles.dateNumber}>
                <span style={{ color: item.date.getDay() === 0 ? 'var(--color-red)' : item.date.getDay() === 6 ? 'var(--color-blue)' : 'inherit' }}>
                  {item.day}
                </span>
                {isToday(item.date) && <span className={styles.todayBadge}>今日</span>}
              </div>
              <div className={styles.eventList}>
                {dayEvents.map(e => (
                  <div key={e.id} className={styles.eventItem} style={e.isAllDay ? { background: 'var(--color-green)' } : {}}>
                    {e.isAllDay ? `終日 ${e.title}` : `${new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} ${e.title}`}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDate(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {selectedDate.toLocaleDateString("ja-JP")} の予定
            </h2>
            {selectedEvents.length === 0 ? (
              <p>予定はありません。</p>
            ) : (
              selectedEvents.map(e => (
                <div key={e.id} className={styles.modalEvent}>
                  <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{e.title}</p>
                  <p style={{ color: "var(--color-blue)", margin: "0.25rem 0" }}>
                    {e.isAllDay ? '終日' : (
                      <>{new Date(e.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      {e.endTime && ` - ${new Date(e.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}</>
                    )}
                  </p>
                  {e.location && <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>📍 {e.location}</p>}
                </div>
              ))
            )}
            <button className={styles.closeBtn} onClick={() => setSelectedDate(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
