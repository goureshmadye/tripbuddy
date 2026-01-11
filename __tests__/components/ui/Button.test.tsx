import { Button } from '@/components/ui/button';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('Button Component', () => {
  it('renders primary button correctly', () => {
    const { toJSON } = render(
      <Button onPress={() => {}} title="Primary Button" />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders secondary button correctly', () => {
    const { toJSON } = render(
      <Button variant="secondary" onPress={() => {}} title="Secondary Button" />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders disabled button correctly', () => {
    const { toJSON } = render(
      <Button disabled onPress={() => {}} title="Disabled Button" />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders loading button correctly', () => {
    const { toJSON } = render(
      <Button loading onPress={() => {}} title="Loading Button" />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders button with icon correctly', () => {
    const { toJSON } = render(
      <Button icon="add" onPress={() => {}} title="Button with Icon" />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});