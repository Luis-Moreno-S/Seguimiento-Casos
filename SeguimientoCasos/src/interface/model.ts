export interface Persona {
  nombre: string;
  edad: number;
}

export interface CalendarModel {
  Fecha: string;
  Estado: string;
  Subject: string;
  Customer: string;
  Duration: number;
  EndDateTime: string;
  StartDateTime: string;
  Participants: Participant[];
}

export interface Participant {
  Type: string;
  Name: string;
  Email: string;
}
