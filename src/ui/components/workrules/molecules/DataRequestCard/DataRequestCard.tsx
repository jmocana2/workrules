import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/shadcn/card';
import { Label } from '@/ui/components/shadcn/label';
import { RadioGroup, RadioGroupItem } from '@/ui/components/shadcn/radio-group';
import { StarRating } from '@/ui/components/workrules/atoms';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

export interface DataRequestOption {
  value: string;
  label: string;
  description?: string;
}

export interface DataRequestField {
  name: string;
  label: string;
  type: 'radio' | 'stars';
  options?: DataRequestOption[];
  required?: boolean;
  helpText?: string;
}

export interface DataRequestCardProps {
  title: string;
  convenioName?: string;
  fields: DataRequestField[];
  onSubmit: (values: Record<string, string>) => void;
  onSkip?: () => void;
  maxAttempts?: number;
  currentAttempt?: number;
  className?: string;
}

export function DataRequestCard({
  title,
  convenioName,
  fields,
  onSubmit,
  onSkip,
  maxAttempts = 3,
  currentAttempt = 1,
  className,
}: DataRequestCardProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce<Record<string, string>>((acc, field) => {
      if (field.type === 'stars') {
        acc[field.name] = '3';
      }
      return acc;
    }, {})
  );
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleFieldChange = (fieldName: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: false }));
  };

  const handleSubmit = () => {
    // Validar campos requeridos
    const newErrors: Record<string, boolean> = {};
    let hasErrors = false;

    fields.forEach((field) => {
      if (field.required && !values[field.name]) {
        newErrors[field.name] = true;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {convenioName && (
          <CardDescription>
            Convenio: <span className="font-medium">{convenioName}</span>
          </CardDescription>
        )}
        {maxAttempts > 1 && (
          <CardDescription className="text-xs">
            Pregunta {currentAttempt} de {maxAttempts}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.name} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {index + 1}.
              </span>
              <Label className={cn(errors[field.name] && 'text-destructive')}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.helpText && (
                <span
                  title={field.helpText}
                  className="text-foreground cursor-help"
                  role="img"
                  aria-label={field.helpText}
                >
                  <HelpCircle className="h-4 w-4" />
                </span>
              )}
            </div>

            {field.type === 'stars' ? (
              <StarRating
                rating={(parseInt(values[field.name] || '3') as 1 | 2 | 3 | 4 | 5)}
                interactive
                onChange={(r) => handleFieldChange(field.name, r.toString())}
                size="lg"
              />
            ) : (
              <RadioGroup
                value={values[field.name] || ''}
                onValueChange={(value) => handleFieldChange(field.name, value)}
                className="space-y-2 pl-5"
              >
                {field.options?.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem
                      value={option.value}
                      id={`${field.name}-${option.value}`}
                    />
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`${field.name}-${option.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      {option.description && (
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}

            {errors[field.name] && (
              <p className="text-xs text-destructive pl-5">
                Este campo es obligatorio
              </p>
            )}
          </div>
        ))}

        <div className="flex flex-col gap-2 pt-4 md:flex-row md:gap-3">
          <Button onClick={handleSubmit} className="w-full md:w-auto">
            Calcular
          </Button>
          {onSkip && (
            <Button variant="outline" onClick={onSkip} className="w-full md:w-auto">
              No lo se - ver todos los rangos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
