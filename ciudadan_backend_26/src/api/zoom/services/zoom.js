"use strict";

const zoomClient = require("./zoom-client");

module.exports = () => ({
  async getAccountProfile() {
    const rawData = await zoomClient.request({
      method: "GET",
      url: "/users/me",
    });

    return {
      id: rawData.id,
      email: rawData.email,
      fullName: `${rawData.first_name} ${rawData.last_name}`.trim(),
      accountType: rawData.type,
      pmi: rawData.pmi,
      timezone: rawData.timezone,
      createdAt: rawData.created_at,
    };
  },
  async getUpcomingMeetings() {
    const rawData = await zoomClient.listMeetings("me", "scheduled");
    const meetings = (rawData.meetings || []).map((meeting) => ({
      id: meeting.id,
      topic: meeting.topic,
      type: meeting.type,
      startTime: meeting.start_time,
      durationMinutes: meeting.duration,
      timezone: meeting.timezone,
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      createdAt: meeting.created_at,
    }));

    return {
      totalRecords: rawData.total_records,
      meetings,
    };
  },
});
