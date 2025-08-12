using System.Linq;
using System.Net.Http;
using System.Web.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Calendars.Controllers
{
    public class ValuesController : ApiController
    {
        #region Variables
        private static readonly HttpClient httpClient = new HttpClient();
        #endregion

        #region Metodos
        [HttpGet]
        [Route("api/Values/GetAccessToken")]
        public async Task<IHttpActionResult> GetAccessToken()
        {
            string token;            
            var requestData = new Dictionary<string, string>
            {
                { "grant_type", "client_credentials" },
                { "scope", "https://graph.microsoft.com/.default" },
                { "client_id", "d9844ae6-b42e-4db6-89f1-1ed28ccf3b70" },
                { "client_secret", "Sgi8Q~xIyAyuPiqciGpXQIqv3cqmzOZJhXnOHdbU" }
            };
            using (var response = await httpClient.PostAsync("https://login.microsoftonline.com/a6f2e2b1-c143-4b66-90e8-9aadc862d90f/oauth2/v2.0/token", new FormUrlEncodedContent(requestData)))
            {
                var jsonResponse = await response.Content.ReadAsStringAsync();
                token = JsonDocument.Parse(jsonResponse).RootElement.GetProperty("access_token").GetString();
            }

            var request = new HttpRequestMessage(HttpMethod.Get, "https://graph.microsoft.com/v1.0/users/daniel.parra@issatec.com/calendar/events?$select=subject,start,attendees");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            request.Headers.Add("Prefer", "outlook.timezone=\"SA Pacific Standard Time\"");

            using (var graphResponse = await httpClient.SendAsync(request))
            {
                var json = await graphResponse.Content.ReadAsStringAsync();
                var events = JsonDocument.Parse(json).RootElement.GetProperty("value")
                    .EnumerateArray()
                    .Select(ev => new
                    {
                        subject = ev.GetProperty("subject").GetString(),
                        startDateTime = ev.GetProperty("start").GetProperty("dateTime").GetString(),
                        attendees = ev.GetProperty("attendees")
                            .EnumerateArray()
                            .Select(a => new
                            {
                                name = a.GetProperty("emailAddress").GetProperty("name").GetString(),
                                email = a.GetProperty("emailAddress").GetProperty("address").GetString(),
                                type = a.GetProperty("type").GetString()
                            }).ToList()
                    }).ToList();
                return Ok(events);
            }
        }
    }
    #endregion
}

