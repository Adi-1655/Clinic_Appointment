function getScheduledSlots(schedule, appointmentDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appointmentDate || ""))) {
        return [];
    }

    const [year, month, day] = appointmentDate.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const daySchedule = schedule.find(item => item.dayOfWeek === dayOfWeek);

    return daySchedule ? daySchedule.slots : [];
}

module.exports = { getScheduledSlots };