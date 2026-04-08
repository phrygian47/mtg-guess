import styles from "./button.module.css";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  id: string;
  name: string;
  type?: "button" | "submit" | "reset";
};

export default function Button({
  children,
  onClick,
  disabled,
  label,
  id,
  name,
  type = "button",
}: ButtonProps) {
  return (
    <div className={styles.wrapper}>
      <button
        type={type}
        className={styles.button}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        id={id}
        name={name}
      >
        {children}
      </button>
    </div>
  );
}
