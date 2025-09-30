using System;
using System.Collections.Generic;

namespace Calendars.Models
{
    public class CalendarModel
    {
        public string Estado { get; set; }
        public string Subject { get; set; }
        public string Customer { get; set; }
        public DateTime EndDateTime { get; set; }
        public DateTime StartDateTime { get; set; }
        public DateTime Fecha => StartDateTime.Date;
        public List<Participant> Participants { get; set; }
        public int Duration => (int)(EndDateTime - StartDateTime).TotalMinutes == 1440 ? 0 : (int)(EndDateTime - StartDateTime).TotalMinutes;
    }
    public class Participant
    {
        public string Type { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
    }
}
