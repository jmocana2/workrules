import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StarRating } from './StarRating';

const meta: Meta<typeof StarRating> = {
  title: 'workrules/atoms/StarRating',
  component: StarRating,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Componente para mostrar y seleccionar calificaciones por estrellas. Usado principalmente para indicar la categoría de establecimientos hoteleros (1-5 estrellas) en convenios de hostelería.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    rating: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 5],
      description: 'Número de estrellas activas',
    },
    maxStars: {
      control: { type: 'number', min: 1, max: 10 },
      description: 'Número máximo de estrellas a mostrar',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño de las estrellas',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Permite interacción del usuario para cambiar la calificación',
    },
    onChange: {
      description: 'Callback que se ejecuta cuando cambia la calificación en modo interactivo',
    },
    className: {
      control: { type: 'text' },
      description: 'Clases CSS adicionales',
    },
  },
};

export default meta;
type Story = StoryObj<typeof StarRating>;

export const Default: Story = {
  args: {
    rating: 3,
    maxStars: 5,
    size: 'md',
    interactive: false,
  },
};

export const FiveStars: Story = {
  args: {
    rating: 5,
    maxStars: 5,
    size: 'md',
    interactive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hotel de 5 estrellas - categoría máxima en el sector hotelero.',
      },
    },
  },
};

export const OneStar: Story = {
  args: {
    rating: 1,
    maxStars: 5,
    size: 'md',
    interactive: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hotel de 1 estrella - categoría mínima en el sector hotelero.',
      },
    },
  },
};

export const AllRatings: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24">1 estrella:</span>
        <StarRating rating={1} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24">2 estrellas:</span>
        <StarRating rating={2} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24">3 estrellas:</span>
        <StarRating rating={3} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24">4 estrellas:</span>
        <StarRating rating={4} />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24">5 estrellas:</span>
        <StarRating rating={5} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Todas las calificaciones posibles de 1 a 5 estrellas.',
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Small:</span>
        <StarRating rating={4} size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Medium:</span>
        <StarRating rating={4} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground w-16">Large:</span>
        <StarRating rating={4} size="lg" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tres tamaños disponibles: small, medium y large.',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [rating, setRating] = useState(3);

    return (
      <div className="flex flex-col items-center gap-4">
        <StarRating
          rating={rating}
          interactive
          onChange={setRating}
        />
        <p className="text-sm text-muted-foreground">
          Calificación seleccionada: {rating} {rating === 1 ? 'estrella' : 'estrellas'}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Haz clic en una estrella o usa las flechas del teclado
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Modo interactivo que permite seleccionar una calificación. Soporta navegación con teclado (flechas izquierda/derecha, Enter y Espacio).',
      },
    },
  },
};

export const HotelCategories: Story = {
  render: () => (
    <div className="bg-card border rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4">Categorías de Hoteles</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Convenio Colectivo de Hostelería - Clasificación de establecimientos según categoría
      </p>
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-3 rounded-md bg-background/50 border border-border/50">
          <StarRating rating={5} size="md" />
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">Hotel 5 estrellas</h4>
            <p className="text-xs text-muted-foreground">
              Lujo excepcional. Salario base: 1,450€/mes
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-md bg-background/50 border border-border/50">
          <StarRating rating={4} size="md" />
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">Hotel 4 estrellas</h4>
            <p className="text-xs text-muted-foreground">
              Primera categoría. Salario base: 1,320€/mes
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-md bg-background/50 border border-border/50">
          <StarRating rating={3} size="md" />
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">Hotel 3 estrellas</h4>
            <p className="text-xs text-muted-foreground">
              Segunda categoría. Salario base: 1,200€/mes
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-md bg-background/50 border border-border/50">
          <StarRating rating={2} size="md" />
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">Hotel 2 estrellas</h4>
            <p className="text-xs text-muted-foreground">
              Tercera categoría. Salario base: 1,100€/mes
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-3 rounded-md bg-background/50 border border-border/50">
          <StarRating rating={1} size="md" />
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">Hotel 1 estrella</h4>
            <p className="text-xs text-muted-foreground">
              Cuarta categoría. Salario base: 1,050€/mes
            </p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
        * Datos ilustrativos basados en convenios del sector hotelero
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Ejemplo real de uso en WorkRules: mostrar categorías de hoteles según convenio colectivo de hostelería con información salarial asociada.',
      },
    },
  },
};
