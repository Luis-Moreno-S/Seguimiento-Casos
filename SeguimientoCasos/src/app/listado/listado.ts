import { Component } from '@angular/core';
import { Persona } from '../../interface/model';

@Component({
  imports: [],
  selector: 'app-listado',  
  styleUrl: './listado.css',
  templateUrl: './listado.html'
})

export class ListadoComponent {
  persona: Persona = {
    nombre: "Luis Moreno",
    edad: 27
  };
}
