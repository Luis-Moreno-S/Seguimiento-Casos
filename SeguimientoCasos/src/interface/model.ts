export interface Persona {
  nombre: string,
  edad: number
}

export interface EventItem {
  subject: string;
  startDateTime: string;
  attendees: Attendee[];
}

interface Attendee {
  name: string;
  email: string;
  type: string;
}