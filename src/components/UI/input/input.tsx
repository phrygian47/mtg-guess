import styles from "./input.module.css";

type TextInputProps = {
  label: string;
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function TextInput({
  label,
  id,
  name,
  value,
  placeholder,
  disabled,
  onChange,
}: TextInputProps) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        className={`${styles.input} ${disabled ? styles.disabled : ""}`}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
