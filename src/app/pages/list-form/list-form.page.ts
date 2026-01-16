import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ViewWillEnter } from '@ionic/angular';
import { Subject, takeUntil } from 'rxjs';
import { CustomList, LIST_CONSTANTS } from '../../models';
import { CustomListService, DatabaseService } from '../../services';

@Component({
  selector: 'app-list-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="isEditing ? '/lists/' + listId : '/lists'"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditing ? 'Editar lista' : 'Nueva lista' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="listForm" (ngSubmit)="onSubmit()">
        <!-- Name Input -->
        <ion-item fill="outline" [class.ion-invalid]="isFieldInvalid('name')">
          <ion-label position="floating">Nombre de la lista *</ion-label>
          <ion-input
            type="text"
            formControlName="name"
            placeholder="Ej: Favoritos"
            [maxlength]="maxNameLength"
          ></ion-input>
        </ion-item>
        <div class="field-hint">
          Mínimo {{ minNameLength }} caracteres, máximo {{ maxNameLength }}. Este campo es obligatorio.
        </div>
        <div class="field-error" *ngIf="getFieldError('name')">
          {{ getFieldError('name') }}
        </div>

        <!-- Description Input -->
        <ion-item fill="outline">
          <ion-label position="floating">Descripción (opcional)</ion-label>
          <ion-textarea
            formControlName="description"
            placeholder="Puedes crear hasta 3 listas"
            [rows]="3"
            [maxlength]="200"
          ></ion-textarea>
        </ion-item>

        <!-- Validation Messages -->
        <div class="validation-info" *ngIf="formError">
          <ion-icon name="alert-circle" color="danger"></ion-icon>
          <span>{{ formError }}</span>
        </div>

        <!-- Info about limits -->
        <div class="info-section" *ngIf="!isEditing">
          <ion-icon name="information-circle-outline"></ion-icon>
          <span>Puedes crear hasta {{ maxLists }} listas</span>
        </div>

        <!-- Submit Button -->
        <div class="form-actions">
          <ion-button
            expand="block"
            type="submit"
            [disabled]="listForm.invalid || isSubmitting"
          >
            <ion-spinner *ngIf="isSubmitting" name="crescent"></ion-spinner>
            <span *ngIf="!isSubmitting">
              {{ isEditing ? 'Guardar cambios' : 'Crear lista' }}
            </span>
          </ion-button>

          <ion-button
            expand="block"
            fill="clear"
            (click)="cancel()"
            [disabled]="isSubmitting"
          >
            Cancelar
          </ion-button>
        </div>
      </form>
    </ion-content>

    <!-- Toast -->
    <ion-toast
      [isOpen]="showToast"
      [message]="toastMessage"
      [duration]="2000"
      [color]="toastColor"
      (didDismiss)="showToast = false"
    ></ion-toast>
  `,
  styles: [`
    ion-item {
      margin-bottom: 8px;
      --background: var(--ion-color-light);
    }

    ion-item ion-input,
    ion-item ion-textarea {
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 12px;
      --padding-bottom: 12px;
    }

    .field-hint {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 4px 0 16px 0;
    }

    .field-error {
      font-size: 12px;
      color: var(--ion-color-danger);
      margin: 4px 0 16px 0;
    }

    .validation-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--ion-color-danger-tint);
      border-radius: 8px;
      margin: 16px 0;
      font-size: 13px;
      color: var(--ion-color-danger-shade);
    }

    .info-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
      margin: 16px 0;
      font-size: 13px;
      color: var(--ion-color-medium);
    }

    .form-actions {
      margin-top: 32px;
    }

    .form-actions ion-button {
      margin-bottom: 8px;
    }
  `]
})
export class ListFormPage implements OnInit, OnDestroy, ViewWillEnter {
  listForm: FormGroup;
  isEditing = false;
  listId: string = '';
  existingList: CustomList | null = null;
  isSubmitting = false;
  formError = '';

  // Constants
  minNameLength = LIST_CONSTANTS.MIN_NAME_LENGTH;
  maxNameLength = LIST_CONSTANTS.MAX_NAME_LENGTH;
  maxLists = LIST_CONSTANTS.MAX_LISTS;

  // Toast
  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  // Book to add after creation (from query params)
  private bookKeyToAdd: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private customListService: CustomListService,
    private databaseService: DatabaseService
  ) {
    this.listForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(this.minNameLength),
        Validators.maxLength(this.maxNameLength),
        Validators.pattern(LIST_CONSTANTS.NAME_PATTERN)
      ]],
      description: ['', [Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    // Check for book to add from query params
    this.route.queryParams.subscribe(params => {
      this.bookKeyToAdd = params['bookKey'] || null;
    });
  }

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && this.route.snapshot.url.some(s => s.path === 'edit')) {
      this.isEditing = true;
      this.listId = id;
      this.loadExistingList();
    } else {
      this.isEditing = false;
      this.listForm.reset();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadExistingList(): Promise<void> {
    try {
      this.existingList = await this.customListService.getList(this.listId);
      
      if (this.existingList) {
        this.listForm.patchValue({
          name: this.existingList.name,
          description: this.existingList.description || ''
        });
      } else {
        this.router.navigate(['/lists']);
      }
    } catch (error) {
      console.error('Error loading list:', error);
      this.router.navigate(['/lists']);
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.listForm.get(field);
    return control ? control.invalid && control.touched : false;
  }

  getFieldError(field: string): string {
    const control = this.listForm.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['minlength']) {
      return `Mínimo ${this.minNameLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `Máximo ${this.maxNameLength} caracteres`;
    }
    if (control.errors['pattern']) {
      return 'Solo letras, números, espacios y guiones';
    }

    return '';
  }

  async onSubmit(): Promise<void> {
    if (this.listForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.formError = '';

    const { name, description } = this.listForm.value;

    try {
      if (this.isEditing) {
        const result = await this.customListService.updateList(this.listId, name, description);
        
        if (result.success) {
          this.showToastMessage('Lista actualizada', 'success');
          this.router.navigate(['/lists', this.listId]);
        } else {
          this.formError = result.error || 'Error al actualizar la lista';
        }
      } else {
        const result = await this.customListService.createList(name, description);
        
        if (result.success && result.list) {
          this.showToastMessage('Lista creada', 'success');

          // If there's a book to add, add it to the new list
          if (this.bookKeyToAdd && result.list) {
            const book = await this.databaseService.getBook(this.bookKeyToAdd);
            if (book) {
              await this.customListService.addBookToList(result.list.id, book);
            }
          }

          this.router.navigate(['/lists', result.list.id]);
        } else {
          this.formError = result.error || 'Error al crear la lista';
        }
      }
    } catch (error: any) {
      console.error('Form error:', error);
      this.formError = error.message || 'Error inesperado';
    } finally {
      this.isSubmitting = false;
    }
  }

  cancel(): void {
    if (this.isEditing) {
      this.router.navigate(['/lists', this.listId]);
    } else {
      this.router.navigate(['/lists']);
    }
  }

  private showToastMessage(message: string, color: string): void {
    this.toastMessage = message;
    this.toastColor = color;
    this.showToast = true;
  }
}
