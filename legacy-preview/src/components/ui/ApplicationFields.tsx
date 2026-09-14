import { type InputHTMLAttributes, type SelectHTMLAttributes } from "react";

type FieldLabelProps = { label: string; required?: boolean; children: React.ReactNode };

export function FieldLabel({ label, required = false, children }: FieldLabelProps) {
  return <label className="application-field"><span className="application-field__label">{required && <em aria-hidden="true">*</em>}{label}</span>{children}</label>;
}

export function UnderlineInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="application-control" {...props} />;
}

export function UnderlineSelect({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="application-control application-control--select" {...props}>{children}</select>;
}
