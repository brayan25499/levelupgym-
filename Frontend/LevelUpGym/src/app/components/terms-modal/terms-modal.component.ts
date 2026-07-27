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
    /* ===== Overlay — matches alert-overlay & login modal ===== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
      animation: termsFadeIn 0.3s ease-out;
    }

    /* ===== Card ===== */
    .modal-content {
      background: var(--dark-2);
      border: 1px solid var(--border);
      max-width: 620px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      animation: termsZoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    /* ===== Header ===== */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border);
      background: var(--dark-3);
    }

    .modal-header h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.6rem;
      letter-spacing: 2px;
      color: var(--white);
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--gray);
      font-size: 2rem;
      cursor: pointer;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.3s ease;
      line-height: 1;
    }

    .close-btn:hover {
      color: var(--white);
    }

    /* ===== Body / Content ===== */
    .modal-body {
      overflow-y: auto;
      padding: 1.5rem 2rem;
      flex: 1;
    }

    /* Scrollbar inside body — matches global scrollbar */
    .modal-body::-webkit-scrollbar { width: 5px; }
    .modal-body::-webkit-scrollbar-track { background: var(--dark-2); }
    .modal-body::-webkit-scrollbar-thumb { background: var(--red); border-radius: 3px; }

    .terms-content {
      font-family: var(--font-body);
      font-size: 0.92rem;
      line-height: 1.7;
      color: var(--gray-light);
    }

    .terms-content h3 {
      font-family: var(--font-heading);
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--red);
      margin-top: 1.5rem;
      margin-bottom: 0.6rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid rgba(220, 20, 60, 0.15);
    }

    .terms-content h3:first-child {
      margin-top: 0;
    }

    .terms-content p {
      margin: 0.5rem 0 1rem;
      text-align: justify;
      color: var(--gray);
    }

    /* ===== Footer ===== */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--border);
      background: var(--dark-3);
    }

    /* ===== Buttons — match global btn-primary / btn-ghost ===== */
    .btn-secondary,
    .btn-primary {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 2px;
      padding: 0.8rem 2rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      display: inline-block;
      clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    }

    .btn-secondary {
      background: var(--dark-3);
      color: var(--gray-light);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .btn-secondary:hover {
      border-color: var(--red);
      color: var(--red);
      transform: translateY(-2px);
    }

    .btn-primary {
      background: var(--red);
      color: var(--white);
    }

    .btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      transform: translateX(-100%);
      transition: transform 0.5s;
    }

    .btn-primary:hover::before {
      transform: translateX(100%);
    }

    .btn-primary:hover {
      background: var(--red-bright);
      transform: translateY(-2px);
      box-shadow: 0 8px 25px var(--red-glow);
    }

    /* ===== Animations ===== */
    @keyframes termsFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes termsZoomIn {
      from { transform: scale(0.8); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }

    /* ===== Responsive ===== */
    @media (max-width: 768px) {
      .modal-overlay {
        padding: 1rem;
      }

      .modal-content {
        max-height: 92vh;
      }

      .modal-header {
        padding: 1.2rem 1.5rem;
      }

      .modal-header h2 {
        font-size: 1.3rem;
        letter-spacing: 1px;
      }

      .modal-body {
        padding: 1.2rem 1.5rem;
      }

      .modal-footer {
        padding: 1.2rem 1.5rem;
        flex-direction: column;
      }

      .btn-secondary,
      .btn-primary {
        width: 100%;
        text-align: center;
        padding: 0.9rem 1.5rem;
      }

      .terms-content h3 {
        margin-top: 1.2rem;
        font-size: 0.95rem;
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
