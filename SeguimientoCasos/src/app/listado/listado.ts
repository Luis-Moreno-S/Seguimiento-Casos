import { Component } from '@angular/core';
import { Persona } from '../../interface/model';

@Component({
  selector: 'app-listado',
  standalone: true,
  imports: [],
  templateUrl: './listado.html',
  styleUrl: './listado.css'
})

export class ListadoComponent {
  persona: Persona = {
    nombre: "Luis Moreno",
    edad: 27
  };
}
