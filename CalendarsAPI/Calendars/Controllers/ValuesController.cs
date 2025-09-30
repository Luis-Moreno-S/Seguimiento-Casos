using System;
using System.Linq;
using System.Web.Http;
using System.Net.Http;
using Calendars.Models;
using System.Text.Json;
using Calendars.Helper;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Calendars.Controllers
{
    public class ValuesController : ApiController
    {
        #region Variables
        IAHelper iHelper = new IAHelper();
        TeamsHelper tHelper = new TeamsHelper();
        #endregion

        #region Metodos
        [HttpGet]
        [Route("api/Values/GetCalendars/{email}/{StartDate}/{EndDate}")]
        public async Task<List<CalendarModel>> GetCalendars(string email, string StartDate, string EndDate)
        {
            var eventsList = new List<CalendarModel>();
            try
            {
                var root = JsonDocument.Parse(await tHelper.GetMeetings(email, DateTime.Parse(StartDate), DateTime.Parse(EndDate).AddDays(1))).RootElement;
                if (root.TryGetProperty("value", out var value))
                {
                    eventsList.AddRange(value.EnumerateArray().Select(ev =>
                    {
                        var participants = ev.GetProperty("attendees").EnumerateArray().Select(a => new Participant
                        {
                            Type = a.GetProperty("type").GetString(),
                            Name = a.GetProperty("emailAddress").GetProperty("name").GetString(),
                            Email = a.GetProperty("emailAddress").GetProperty("address").GetString()
                        }).ToList();

                        return new CalendarModel
                        {
                            Participants = participants,
                            Customer = GetCustomer(participants),
                            Subject = ev.GetProperty("subject").GetString(),
                            Estado = ev.GetProperty("isCancelled").GetBoolean() ? "Cancelada" : "Realizada",
                            StartDateTime = DateTime.Parse(ev.GetProperty("start").GetProperty("dateTime").GetString()),
                            EndDateTime = DateTime.Parse(ev.GetProperty("end").GetProperty("dateTime").GetString())
                        };
                    }).Where(e => e.Duration > 0 && !e.Subject.ToLower().Contains("almuerzo")));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error obteniendo eventos: {ex.Message}");
            }
            return eventsList;
        }

        [HttpPost]
        [Route("api/Values/GetAnalysisTable")]
        public async Task<string> GetAnalysisTable(List<CalendarModel> meetings)
        {
            string data = JsonSerializer.Serialize(meetings, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            return await iHelper.ProcessTable(data);
        }

        [HttpPost]
        [Route("api/Values/GetAnalysisWidgets")]
        public async Task<string> GetAnalysisWidgets(List<CalendarModel> meetings)
        {
            string data = JsonSerializer.Serialize(meetings, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            return await iHelper.ProcessWidgets(data);
        }
        #endregion

        #region Auxiliares
        private string GetCustomer(List<Participant> participants)
        {
            var dominios = participants.Select(p => p.Email.Split('@').Last().ToLower())
                                       .Where(d => d != "gmail.com" && d != "outlook.com")
                                       .Select(d => d.StartsWith("issatec0") ? "issatec.com" : d)
                                       .Distinct()
                                       .ToList();
            if (dominios.All(d => d == "issatec.com"))
            {
                return "Issatec";
            }
            else
            {
                var dominioCliente = dominios.First(d => d != "issatec.com");
                return dominioCliente.Split('.').First().ToUpper();
            }
        }
        #endregion
    }
}

