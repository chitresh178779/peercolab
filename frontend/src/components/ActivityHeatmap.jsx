import { useState, useEffect } from 'react';
import { Calendar, Flame, CheckCircle, TrendingUp, HelpCircle } from 'lucide-react';

function ActivityHeatmap({ subjects }) {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    activeDays: 0,
    longestStreak: 0,
    currentStreak: 0,
    maxInADay: 0,
  });
  const [hoveredCell, setHoveredCell] = useState(null);

  // Helper to format Date into local YYYY-MM-DD
  const getLocalDateString = (dateInput) => {
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // 1. Gather all completed tasks
    const tasks = [];
    subjects.forEach((subj) => {
      if (subj.tasks) {
        subj.tasks.forEach((task) => {
          if (task.isCompleted && task.completedAt) {
            tasks.push({
              ...task,
              subjectName: subj.name,
            });
          }
        });
      }
    });

    // Sort tasks chronologically by completion date
    tasks.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    setCompletedTasks(tasks);

    // 2. Count completions per day
    const countsByDate = {};
    tasks.forEach((task) => {
      const dateStr = getLocalDateString(task.completedAt);
      countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
    });

    // 3. Generate date grid (last 53 weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Start date is Sunday of 52 weeks ago (total 53 weeks including current)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364 - currentDayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    // Calculate Longest Streak
    let longestStreak = 0;
    let runningStreak = 0;
    let tempCheckDate = new Date(startDate);
    
    while (tempCheckDate <= today) {
      const dateStr = getLocalDateString(tempCheckDate);
      if (countsByDate[dateStr] > 0) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
      tempCheckDate.setDate(tempCheckDate.getDate() + 1);
    }

    // Calculate Current Streak
    let currentStreak = 0;
    let checkDate = new Date(today);
    const todayStr = getLocalDateString(checkDate);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (countsByDate[todayStr] > 0) {
      while (countsByDate[getLocalDateString(checkDate)] > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (countsByDate[yesterdayStr] > 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      while (countsByDate[getLocalDateString(checkDate)] > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    const maxInADay = Object.values(countsByDate).length > 0 
      ? Math.max(...Object.values(countsByDate)) 
      : 0;

    const activeDays = Object.keys(countsByDate).length;

    setStats({
      totalCompleted: tasks.length,
      activeDays,
      longestStreak,
      currentStreak,
      maxInADay,
    });
  }, [subjects]);

  // Generate list of days for heatmap
  const getHeatmapDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDayOfWeek = today.getDay();
    
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364 - currentDayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    const daysList = [];
    const temp = new Date(startDate);
    
    // Fill up to the Saturday of the current week to complete the 53-week grid (53 * 7 = 371 days)
    const totalDaysToRender = 371; 
    for (let i = 0; i < totalDaysToRender; i++) {
      daysList.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return daysList;
  };

  const heatmapDays = getHeatmapDays();

  // Map completions counts per day for easy grid styling
  const countsByDate = {};
  completedTasks.forEach((task) => {
    const dateStr = getLocalDateString(task.completedAt);
    countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
  });

  // Helper to determine background color class
  const getCellColorClass = (count) => {
    if (!count || count === 0) return 'heatmap-cell-0';
    if (count === 1) return 'heatmap-cell-1';
    if (count === 2) return 'heatmap-cell-2';
    if (count <= 4) return 'heatmap-cell-3';
    return 'heatmap-cell-4';
  };

  // Generate Month headers (placed correctly horizontally)
  const renderMonthHeaders = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const headers = [];
    let lastMonth = -1;

    // Jump by weeks (every 7 days) and add label if month changes
    for (let i = 0; i < heatmapDays.length; i += 7) {
      const date = heatmapDays[i];
      const monthIndex = date.getMonth();
      if (monthIndex !== lastMonth) {
        headers.push({
          label: months[monthIndex],
          colIndex: Math.floor(i / 7),
        });
        lastMonth = monthIndex;
      }
    }

    // Filter headers that are too close to each other
    return headers.map((h, index) => {
      // Inline styles for column positioning
      const gridColumnStart = h.colIndex + 1;
      return (
        <span 
          key={index} 
          style={{ 
            gridColumnStart, 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            fontWeight: '600',
            textAlign: 'left'
          }}
        >
          {h.label}
        </span>
      );
    });
  };

  return (
    <div className="workspace-pane animate-fade-in" style={{ width: '100%' }}>
      <h3>
        <Calendar size={20} className="icon-blue" style={{ color: 'var(--accent-blue)' }} />
        <span>Your Study & Activity Heatmap</span>
      </h3>
      
      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Track your task completion streaks and daily productivity. Completed tasks across all subjects are integrated below.
      </p>

      {/* STATS OVERVIEW CARDS */}
      <div className="profile-stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon-container" style={{ background: 'var(--accent-emerald-glow)' }}>
            <CheckCircle size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.totalCompleted}</span>
            <span className="stat-lbl">Total Completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ background: 'var(--accent-purple-glow)' }}>
            <Flame size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.currentStreak} Days</span>
            <span className="stat-lbl">Current Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ background: 'var(--accent-amber-glow)' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-amber)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.longestStreak} Days</span>
            <span className="stat-lbl">Longest Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-container" style={{ background: 'var(--accent-blue-glow)' }}>
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{stats.activeDays}</span>
            <span className="stat-lbl">Productive Days</span>
          </div>
        </div>
      </div>

      {/* HEATMAP CALENDAR CONTAINER */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2.5px solid #000000', backgroundColor: '#ffffff' }}>
        
        {/* Month labels header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(53, 1fr)', 
          gap: '3px', 
          marginBottom: '5px',
          marginLeft: '35px' // aligned with day labels spacing
        }}>
          {renderMonthHeaders()}
        </div>

        {/* Heatmap grid + Day Labels */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          
          {/* Day labels (vertical column) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between', 
            height: '112px', // matches 7 cells * 13px + 6 gap * 3px
            fontSize: '0.7rem', 
            color: 'var(--text-muted)', 
            fontWeight: '600',
            width: '27px',
            textAlign: 'right',
            paddingRight: '4px'
          }}>
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
          </div>

          {/* Grid Cells */}
          <div 
            className="heatmap-grid" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(53, 1fr)', 
              gridTemplateRows: 'repeat(7, 1fr)', 
              gridAutoFlow: 'column', 
              gap: '3px',
              flexGrow: 1,
              overflowX: 'auto',
              scrollbarWidth: 'thin'
            }}
          >
            {heatmapDays.map((day, idx) => {
              const dateStr = getLocalDateString(day);
              const count = countsByDate[dateStr] || 0;
              const colorClass = getCellColorClass(count);
              const isFuture = day > new Date();

              return (
                <div
                  key={idx}
                  className={`heatmap-cell ${colorClass} ${isFuture ? 'heatmap-cell-future' : ''}`}
                  style={{
                    width: '13px',
                    height: '13px',
                    borderRadius: '2.5px',
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    cursor: isFuture ? 'default' : 'pointer',
                    transition: 'transform 0.1s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (isFuture) return;
                    e.currentTarget.style.transform = 'scale(1.3)';
                    e.currentTarget.style.zIndex = '10';
                    setHoveredCell({
                      date: day.toLocaleDateString(undefined, { dateStyle: 'medium' }),
                      count,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                    setHoveredCell(null);
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Less</span>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#FAF8F5' }}></div>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#DCFCE7' }}></div>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#86EFAC' }}></div>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#22C55E' }}></div>
          <div style={{ width: '11px', height: '11px', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.15)', backgroundColor: '#15803D' }}></div>
          <span>More</span>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {hoveredCell && (
        <div 
          style={{
            position: 'fixed',
            left: `${hoveredCell.x + 10}px`,
            top: `${hoveredCell.y - 35}px`,
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: '600',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            border: '1px solid #ffffff'
          }}
        >
          {hoveredCell.count === 0 ? 'No tasks' : `${hoveredCell.count} task${hoveredCell.count > 1 ? 's' : ''}`} completed on {hoveredCell.date}
        </div>
      )}

      {/* DETAILED ACTIVITY STREAM FOR THE SELECTED HEATMAP */}
      <div className="glass-card" style={{ padding: '1.5rem', border: '2.5px solid #000000', backgroundColor: '#ffffff', textAlign: 'left' }}>
        <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} style={{ color: 'var(--accent-emerald)' }} />
          <span>Recently Completed Targets</span>
        </h4>

        {completedTasks.length === 0 ? (
          <p className="no-data" style={{ margin: 0, fontSize: '0.85rem' }}>No tasks completed yet. Complete tasks in your workspace to log details here!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {completedTasks.slice().reverse().map((task, idx) => (
              <div 
                key={task._id || idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem 1rem', 
                  background: 'rgba(21, 128, 61, 0.05)', 
                  border: '1.5px solid #000000', 
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px #000000'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{task.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Subject: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{task.subjectName}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {new Date(task.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityHeatmap;
