import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onBackdropClick()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Términos y Condiciones</h2>
          <button class="close-btn" (click)="close()">×</button>
        </div>
        <div class="modal-body">
          <div class="terms-content">
            <h3>1. Aceptación de Términos</h3>
            <p>
              Al acceder y utilizar esta plataforma de LevelUp Gym, aceptas estos términos y condiciones
              en su totalidad. Si no estás de acuerdo con alguno de estos términos, por favor no utilices
              nuestro sitio web.
            </p>

            <h3>2. Licencia de Uso</h3>
            <p>
              Se te concede una licencia limitada, no exclusiva y revocable para acceder y utilizar
              esta plataforma únicamente con propósitos personales y no comerciales. No está permitido
              reproducir, distribuir o transmitir cualquier contenido sin autorización previa.
            </p>

            <h3>3. Cuenta de Usuario</h3>
            <p>
              Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Aceptas
              responsabilidad por todas las actividades que ocurran bajo tu cuenta. Debes notificarnos
              inmediatamente de cualquier uso no autorizado de tu cuenta.
            </p>

            <h3>4. Privacidad y Protección de Datos</h3>
            <p>
              Tu privacidad es importante para nosotros. Utilizamos tus datos personales únicamente
              para mejorar nuestros servicios. No compartiremos tu información con terceros sin tu
              consentimiento explícito, excepto cuando sea requerido por ley.
            </p>

            <h3>5. Propiedad Intelectual</h3>
            <p>
              Todo el contenido incluido en esta plataforma, incluyendo texto, gráficos, logos,
              imágenes y software, es propiedad de LevelUp Gym o de sus proveedores de contenido
              y está protegido por leyes internacionales de derechos de autor.
            </p>

            <h3>6. Limitación de Responsabilidad</h3>
            <p>
              En la máxima medida permitida por la ley, LevelUp Gym no será responsable por daños
              indirectos, incidentales, especiales, consecuentes o punitivos resultantes del uso
              de esta plataforma.
            </p>

            <h3>7. Modificación de Términos</h3>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios
              entrarán en vigor inmediatamente después de su publicación. Tu uso continuado de la
              plataforma constituye aceptación de los términos modificados.
            </p>

            <h3>8. Terminación del Servicio</h3>
            <p>
              Podemos suspender o terminar tu acceso en cualquier momento, por cualquier razón,
              sin previo aviso ni responsabilidad.
            </p>

            <h3>9. Ley Aplicable</h3>
            <p>
              Estos términos y condiciones se rigen por las leyes de Colombia y se sujetan a la
              jurisdicción de los tribunales colombianos.
            </p>

            <h3>10. Contacto</h3>
            <p>
              Si tienes preguntas sobre estos términos y condiciones, contáctanos en
              contact@levelupgym.com
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="close()">Rechazar</button>
          <button class="btn-primary" (click)="accept()">Aceptar Términos</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s;
    }

    .close-btn:hover {
      opacity: 0.7;
    }

    .modal-body {
      overflow-y: auto;
      padding: 20px;
      flex: 1;
    }

    .terms-content {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #333;
    }

    .terms-content h3 {
      margin-top: 20px;
      margin-bottom: 10px;
      color: #667eea;
      font-weight: 600;
    }

    .terms-content p {
      margin: 10px 0;
      text-align: justify;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      background-color: #f5f5f5;
      border-radius: 0 0 12px 12px;
    }

    .btn-secondary,
    .btn-primary {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }

    .btn-secondary {
      background-color: #e0e0e0;
      color: #333;
    }

    .btn-secondary:hover {
      background-color: #c0c0c0;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
      .modal-content {
        width: 95%;
        max-height: 90vh;
      }

      .modal-header h2 {
        font-size: 1.2rem;
      }

      .terms-content h3 {
        margin-top: 15px;
      }
    }
  `]
})
export class TermsModalComponent {
  isOpen = false;

  @Output() accepted = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();

  open(): void {
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = 'auto';
    this.rejected.emit();
  }

  accept(): void {
    this.isOpen = false;
    document.body.style.overflow = 'auto';
    this.accepted.emit();
  }

  onBackdropClick(): void {
    this.close();
  }
}
