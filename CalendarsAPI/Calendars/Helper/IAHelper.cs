using System;
using System.Text;
using Newtonsoft.Json;
using System.Net.Http;
using System.Threading.Tasks;
using System.Net.Http.Headers;

namespace Calendars.Helper
{
    public class IAHelper
    {
        #region Variables
        private const string ApiUrl = "https://api.openai.com/v1/chat/completions";
        private const string ApiKey = "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";
        #endregion

        #region Metodos
        public async Task<string> ProcessTable(string meetings)
        {
            HttpClient client = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
            var payload = new
            {
                model = "gpt-4o-mini",
                messages = new object[]
                {
                    new {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "text", text = $@"{GetPromptTable(meetings)}" }
                        }
                    }
                }
            };
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
            var res = await client.PostAsync(ApiUrl, new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));
            if (res.IsSuccessStatusCode)
            {
                dynamic obj = JsonConvert.DeserializeObject(await res.Content.ReadAsStringAsync());
                return obj.choices[0].message.content.ToString().Replace("```html", "").Replace("```", "").Replace("\n", "");
            }
            else
            {
                return null;
            }
        }
        public async Task<string> ProcessWidgets(string meetings)
        {
            HttpClient client = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
            var payload = new
            {
                model = "gpt-5",
                messages = new object[]
                {
                    new {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "text", text = $@"{GetPromptWidgets(meetings)}" }
                        }
                    }
                }
            };
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
            var res = await client.PostAsync(ApiUrl, new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"));
            if (res.IsSuccessStatusCode)
            {
                dynamic obj = JsonConvert.DeserializeObject(await res.Content.ReadAsStringAsync());
                return obj.choices[0].message.content.ToString().Replace("```html", "").Replace("```", "").Replace("\n", "").Replace("\r", "");
            }
            else
            {
                return null;
            }
        }
        #endregion

        #region Auxiliar
        private string GetPromptTable(string data)
        {
            var prompt = @"Transfórmate en un analista de datos profesional, ayúdame a generar un análisis de los siguientes datos, 
                          analiza la columna de cliente y generar un análisis de datos por cliente o proyecto. No tengas en cuanta las
                          reuniones canceladas.

                          Ten en cuenta la siguiente plantilla y agrega algo adicional si lo ves necesario, 
                          no agregues texto adicional conversacional ya que se mostrará en una aplicación.

                          Agrega los datos en este HTML y regrésalo con los datos mapeados:

                          <table class='table table-striped table-bordered align-middle'>
                            <tr>
                              <th>Cliente</th>
                              <th>Nº Reuniones</th>
                              <th>Minutos Totales</th>
                              <th>Promedio por reunión</th>
                            </tr>
                          </table>";
            return $"{prompt}\n\nDatos:\n{data}";
        }
        private string GetPromptWidgets(string data)
        {
            var prompt = @"Transfórmate en un analista de datos profesional, ayúdame a generar un análisis de los siguientes datos, 
                          analiza los tiempos de reunión máximos, mínimos, promedios de tiempo excluyendo. 

                          Ten en cuenta la siguiente plantilla, no agregues texto adicional conversacional ya que se mostrará en una aplicación.

                          Agrega los datos en este HTML y regrésalo con los datos mapeados:
                          
                          <div class='col-lg-4'>
                            <div class='section-card text-start'>
                              <h4 class='section-title' style='color: #1e3a8a'>Resumen General</h4>
                              <p>
                                <strong>Total de reuniones programadas:</strong> <br>
                                <strong>Reuniones realizadas:</strong> <br>
                                <strong>Reuniones canceladas:</strong> <br>
                                <strong>Duración total invertida en reuniones:</strong> min (horas)<br>
                                <strong>Duración promedio de reunión:</strong>  min (horas)<br>
                                <strong>Duración mínima:</strong> min (reunion)<br>
                                <strong>Duración máxima:</strong> min (reunion)
                              </p>
                            </div>
                          </div>
                          <div class='col-lg-2'>
                            <div class='section-card text-start'>
                              <h4 class='section-title' style='color: #1e3a8a'>Distribución</h4>
                              <p>
                                <strong>Reuniones cortas (≤ 30 min):</strong> <br>
                                <strong>Reuniones medias (31 – 60 min):</strong> <br>
                                <strong>Reuniones largas (> 60 min):</strong> <br>
                              </p>
                            </div>
                          </div>
                          <div class='col-lg-3'>
                            <div class='section-card text-start'>
                              <h4 class='section-title' style='color: #1e3a8a'>Participación y Eficiencia</h4>
                              <p>
                                <strong>Reuniones con &gt;4 participantes:</strong> # (cliente)<br>
                                <strong>Reuniones con 2 participantes:</strong> # (cliente)<br>
                              </p>
                            </div>
                          </div>
                          <div class='col-lg-3'>
                            <div class='section-card text-start'>
                              <h4 class='section-title' style='color: #1e3a8a'>Conclusiones y Recomendaciones</h4>
                              <ol>
                                <li><b>Carga de reuniones:</b> </li>
                                <li><b>Cliente con mayor interacción:</b> </li>
                                <li><b>Cliente que ocupa más tiempo:</b> </li>
                                <li><b>Oportunidad:</b> </li>
                              </ol>
                            </div>
                          </div>";
            return $"{prompt}\n\nDatos:\n{data}";
        }
        #endregion
    }
}