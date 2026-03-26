using System;
using System.Linq;
using System.Web.Http;
using System.Net.Http;
using Calendars.Models;
using System.Text.Json;
using Calendars.Helper;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Calendars.Controllers
{
    public class ValuesController : ApiController
    {
        #region Variables
        IAHelper iHelper = new IAHelper();
        TeamsHelper tHelper = new TeamsHelper();
        private const string IssatecDomain = "issatec.com";
        private static readonly HashSet<string> FreeMailDomains = new HashSet<string>
        {
            "gmail.com",
            "outlook.com",
            "hotmail.com",
            "live.com",
            "msn.com",
            "yahoo.com",
            "yahoo.es",
            "icloud.com",
            "me.com",
            "aol.com",
            "protonmail.com",
            "gmx.com"
        };
        private static readonly Dictionary<string, string[]> CustomerAliases = new Dictionary<string, string[]>
        {
            { "CNSR", new[] { "cnsr" } },
            { "Colfondos", new[] { "colfondos" } },
            { "Coprocenva", new[] { "coprocenva" } },
            { "Cosmitet", new[] { "cosmitet" } },
            { "Davibank", new[] { "davibank" } },
            { "Disfarma", new[] { "disfarma" } },
            { "Duana", new[] { "duana" } },
            { "Issatec", new[] { "issatec" } },
            { "Itau", new[] { "itau" } },
            { "Nogales", new[] { "nogales" } }
        };
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
                            Customer = GetCustomer(participants, ev.GetProperty("subject").GetString()),
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
        private string GetCustomer(List<Participant> participants, string subject)
        {
            var participantDomains = GetNormalizedParticipantDomains(participants);
            var externalDomain = participantDomains.FirstOrDefault(d => d != IssatecDomain);

            // Prioridad 1: al menos un participante externo -> customer por dominio.
            if (!string.IsNullOrWhiteSpace(externalDomain))
            {
                return GetCustomerFromDomain(externalDomain);
            }

            // Prioridad 2 y 3: todos internos o sin participantes -> analizar subject.
            var customerFromSubject = TryGetCustomerFromSubject(subject);
            if (!string.IsNullOrWhiteSpace(customerFromSubject))
            {
                return customerFromSubject;
            }

            // Prioridad 4: fallback.
            return "Issatec";
        }

        private List<string> GetNormalizedParticipantDomains(List<Participant> participants)
        {
            if (participants == null || participants.Count == 0)
            {
                return new List<string>();
            }

            return participants
                .Select(p => p?.Email)
                .Where(email => !string.IsNullOrWhiteSpace(email) && email.Contains("@"))
                .Select(email => email.Split('@').Last().Trim().ToLower())
                .Where(domain => !FreeMailDomains.Contains(domain))
                .Select(NormalizeIssatecDomain)
                .Distinct()
                .ToList();
        }

        private string NormalizeIssatecDomain(string domain)
        {
            return domain.StartsWith("issatec0") ? IssatecDomain : domain;
        }

        private string GetCustomerFromDomain(string domain)
        {
            var firstSegment = domain.Split('.').FirstOrDefault();
            if (string.IsNullOrWhiteSpace(firstSegment))
            {
                return "Issatec";
            }

            return firstSegment.ToUpperInvariant();
        }

        private string TryGetCustomerFromSubject(string subject)
        {
            var normalizedSubject = NormalizeText(subject);
            if (string.IsNullOrWhiteSpace(normalizedSubject))
            {
                return null;
            }

            // Score simple: cuenta cuántas veces aparece cada alias y se queda con el mayor.
            var bestCustomer = CustomerAliases
                .Select(entry => new
                {
                    Customer = entry.Key,
                    Score = entry.Value.Sum(alias => CountOccurrences(normalizedSubject, NormalizeText(alias)))
                })
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Customer)
                .FirstOrDefault();

            return bestCustomer != null && bestCustomer.Score > 0 ? bestCustomer.Customer : null;
        }

        private int CountOccurrences(string text, string token)
        {
            if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(token))
            {
                return 0;
            }

            var count = 0;
            var index = 0;
            while ((index = text.IndexOf(token, index, StringComparison.Ordinal)) >= 0)
            {
                count++;
                index += token.Length;
            }
            return count;
        }

        private string NormalizeText(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return string.Empty;
            }

            var normalized = input.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder(normalized.Length);
            foreach (var c in normalized)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(c);
                if (category != UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }

            return sb.ToString().Normalize(NormalizationForm.FormC);
        }
        #endregion
    }
}

