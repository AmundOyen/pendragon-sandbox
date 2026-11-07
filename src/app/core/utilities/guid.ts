export const guid = (() => {
  function create() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
  }

  create.empty = '00000000-0000-0000-0000-000000000000';

  create.isNullOrEmpty = (value: string | null | undefined) => {
    return !value || value === create.empty;
  }

  create.isGuid = (value: string | null | undefined) => {
    if (!value) return false;
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return guidRegex.test(value);
  };

  return create;
})();
