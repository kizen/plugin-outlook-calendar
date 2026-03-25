({ state }) => {
  const data = state.result?.data?.value || [];

  return data.map((calendar) => {
    return {
      label: calendar.name,
      value: calendar.id,
    };
  });
};
