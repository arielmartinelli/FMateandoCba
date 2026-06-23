import React, { useState } from 'react';
import { Info, HelpCircle } from 'lucide-react';

export default function CureGuide() {
  const [activeTab, setActiveTab] = useState('calabaza');

  const guides = {
    calabaza: {
      title: 'Mate de Calabaza',
      subtitle: 'La calabaza es un material orgánico y poroso. Es fundamental curarlo para sellar los poros, evitar la formación de hongos y evitar que se agriete.',
      steps: [
        {
          num: '1',
          title: 'Lavado inicial',
          desc: 'Enjuagar el interior del mate únicamente con agua tibia (sin detergente ni jabones) para remover cualquier resto de polvo o fibras de calabaza.'
        },
        {
          num: '2',
          title: 'Llenar con yerba húmeda',
          desc: 'Llenar el mate hasta el tope con yerba usada (que todavía mantenga humedad). No uses yerba nueva, ya que tiene demasiados componentes solubles.'
        },
        {
          num: '3',
          title: 'Agregar agua tibia',
          desc: 'Verter un poco de agua tibia (a unos 70°C) para mantener la yerba húmeda. La calabaza absorberá el líquido, así que revisa y agrega un poco más si se seca.'
        },
        {
          num: '4',
          title: 'Reposo de 24 horas',
          desc: 'Dejar reposar el mate en un lugar seco y templado durante 24 horas completas. Esto permite que el cuero y la calabaza se asienten.'
        },
        {
          num: '5',
          title: 'Raspado interior',
          desc: 'Vaciar el mate y, con una cuchara sopera, raspar suavemente las paredes internas para quitar el hollejo o las membranas flojas de la calabaza.'
        },
        {
          num: '6',
          title: 'Repetir el proceso',
          desc: 'Para un curado óptimo, repetir los pasos 2 a 5 al menos una vez más. El mate quedará listo para usar con un color verdoso/oscuro en su interior.'
        }
      ],
      tip: 'Nunca dejes el mate con yerba usada por más de 48 horas una vez curado, ya que podría generar hongos debido a la humedad constante.'
    },
    algarrobo: {
      title: 'Mate de Algarrobo',
      subtitle: 'La madera de algarrobo es resistente y aromática, pero al ser madera, tiende a agrietarse si se seca bruscamente o absorbe agua de golpe. El curado la protege.',
      steps: [
        {
          num: '1',
          title: 'Untar con materia grasa',
          desc: 'Untar todo el interior del mate con una capa fina de mantequilla, aceite de cocina o grasa vacuna. Esto impermeabiliza los poros de la madera.'
        },
        {
          num: '2',
          title: 'Dejar absorber',
          desc: 'Dejar reposar el mate durante 12 a 24 horas para que la madera absorba la materia grasa por completo.'
        },
        {
          num: '3',
          title: 'Llenar con yerba y agua',
          desc: 'Llenar el mate con yerba usada y agregar agua tibia (70°C). Dejar reposar durante 24 horas para que la madera absorba el sabor característico.'
        },
        {
          num: '4',
          title: 'Enjuague final',
          desc: 'Retirar la yerba, enjuagar con agua tibia únicamente y secar muy bien con un paño limpio o papel de cocina.'
        }
      ],
      tip: 'Evita secar el mate de algarrobo al sol directo o cerca de una fuente de calor (estufas), ya que los cambios bruscos de temperatura agrietan la madera.'
    }
  };

  const currentGuide = guides[activeTab];

  return (
    <section id="curado" className="cure-guide-section">
      <div className="container">
        <div className="section-title">
          <h2>Cómo curar tu Mate</h2>
          <p>Sigue esta guía interactiva para preparar tu mate antes del primer uso</p>
        </div>

        <div className="cure-tabs-container bg-glass">
          <div className="cure-tabs">
            <button
              className={`tab-btn ${activeTab === 'calabaza' ? 'active' : ''}`}
              onClick={() => setActiveTab('calabaza')}
            >
              Mate de Calabaza
            </button>
            <button
              className={`tab-btn ${activeTab === 'algarrobo' ? 'active' : ''}`}
              onClick={() => setActiveTab('algarrobo')}
            >
              Mate de Algarrobo (Madera)
            </button>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              Guía de Curado: {currentGuide.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {currentGuide.subtitle}
            </p>
          </div>

          <div className="cure-steps">
            {currentGuide.steps.map((step) => (
              <div key={step.num} className="step-card">
                <div className="step-number">{step.num}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="cure-tip">
            <Info size={24} />
            <p><strong>Consejo del Cebador:</strong> {currentGuide.tip}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
