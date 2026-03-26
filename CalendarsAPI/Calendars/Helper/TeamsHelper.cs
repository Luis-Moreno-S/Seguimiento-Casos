using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Net.Http.Headers;
using System.Collections.Generic;
using System.Linq;

namespace Calendars.Helper
{
    public class TeamsHelper
    {
        #region Variables
        private static readonly HttpClient httpClient = new HttpClient();
        #endregion

        #region Metodos
        public async Task<string> GetMeetings(string email, DateTime StartDate, DateTime EndDate)
        {
            try
            {
                var token = await GetToken();
                var url = $"https://graph.microsoft.com/v1.0/users/{email}/calendarView?startDateTime={StartDate:o}&endDateTime={EndDate:o}&$select=subject,start,end,attendees,isCancelled,createdDateTime,lastModifiedDateTime";
                var allEvents = new List<JsonElement>();

                while (!string.IsNullOrWhiteSpace(url))
                {
                    var request = new HttpRequestMessage(HttpMethod.Get, url);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    request.Headers.Add("Prefer", "outlook.timezone=\"SA Pacific Standard Time\"");
                    var response = await httpClient.SendAsync(request);
                    response.EnsureSuccessStatusCode();

                    var json = await response.Content.ReadAsStringAsync();
                    using (var doc = JsonDocument.Parse(json))
                    {
                        var root = doc.RootElement;
                        if (root.TryGetProperty("value", out var value))
                        {
                            allEvents.AddRange(value.EnumerateArray().Select(item => item.Clone()));
                        }

                        if (root.TryGetProperty("@odata.nextLink", out var nextLinkElement))
                        {
                            url = nextLinkElement.GetString();
                        }
                        else
                        {
                            url = null;
                        }
                    }
                }

                var result = JsonSerializer.Serialize(new
                {
                    value = allEvents
                });
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error obteniendo eventos: {ex.Message}");
                return null;
            }
        }
        #endregion

        #region Auxiliar
        private async Task<string> GetToken()
        {
            try
            {
                var requestData = new Dictionary<string, string>
                {
                    { "grant_type", "client_credentials" },
                    { "scope", "https://graph.microsoft.com/.default" },
                    { "client_id", "d9844ae6-b42e-4db6-89f1-1ed28ccf3b70" },
                    { "client_secret", "Sgi8Q~xIyAyuPiqciGpXQIqv3cqmzOZJhXnOHdbU" }
                };
                var response = await httpClient.PostAsync("https://login.microsoftonline.com/a6f2e2b1-c143-4b66-90e8-9aadc862d90f/oauth2/v2.0/token", new FormUrlEncodedContent(requestData));
                var jsonResponse = await response.Content.ReadAsStringAsync();
                return JsonDocument.Parse(jsonResponse).RootElement.GetProperty("access_token").GetString();
            }
            catch (Exception)
            {
                return "";
            }
        }
        #endregion
    }
}