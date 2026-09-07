"use client";

import { useReducer, useCallback, useMemo } from "react";

type FormState = Record<string, string>;

type Action =
  | { type: "SET_FIELD"; field: string; value: string }
  | { type: "SET_MULTIPLE"; fields: Partial<FormState> }
  | { type: "RESET"; initial: FormState };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_MULTIPLE":
      return { ...state, ...action.fields };
    case "RESET":
      return action.initial;
    default:
      return state;
  }
}

export function useVehicleForm(initial: FormState) {
  const [form, dispatch] = useReducer(reducer, initial);

  const setField = useCallback((field: string, value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  }, []);

  const setMultiple = useCallback((fields: Partial<FormState>) => {
    dispatch({ type: "SET_MULTIPLE", fields });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET", initial: initial as FormState });
  }, [initial]);

  // Para compatibilidade com onChange de <input> e <select>
  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setField(field, e.target.value);
    },
    [setField]
  );

  // Handler para checkbox
  const handleCheckboxChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setField(field, e.target.checked ? "true" : "false");
    },
    [setField]
  );

  return { form, setField, setMultiple, reset, handleChange, handleCheckboxChange };
}