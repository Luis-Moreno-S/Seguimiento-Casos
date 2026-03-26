import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Participant } from '../../../interface/model';

@Component({
  selector: 'app-participant-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './participant-list.html',
  styleUrl: './participant-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParticipantListComponent {
  @Input() participants: Participant[] = [];

  readonly collapsedLimit = 3;
  isExpanded = false;

  get visibleParticipants(): Participant[] {
    if (this.isExpanded || this.participants.length <= this.collapsedLimit) {
      return this.participants;
    }
    return this.participants.slice(0, this.collapsedLimit);
  }

  get remainingCount(): number {
    return Math.max(this.participants.length - this.collapsedLimit, 0);
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }
}
