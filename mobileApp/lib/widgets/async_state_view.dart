import 'package:flutter/material.dart';

enum AsyncStateStatus {
  loading,
  success,
  error,
  empty,
}

class AsyncState<T> {
  const AsyncState._({
    required this.status,
    this.data,
    this.message,
  });

  final AsyncStateStatus status;
  final T? data;
  final String? message;

  const AsyncState.loading()
      : this._(status: AsyncStateStatus.loading);

  const AsyncState.success(T data)
      : this._(status: AsyncStateStatus.success, data: data);

  const AsyncState.empty([String? message])
      : this._(status: AsyncStateStatus.empty, message: message);

  const AsyncState.error(String message)
      : this._(status: AsyncStateStatus.error, message: message);

  bool get isLoading => status == AsyncStateStatus.loading;
  bool get isSuccess => status == AsyncStateStatus.success;
  bool get isEmpty => status == AsyncStateStatus.empty;
  bool get isError => status == AsyncStateStatus.error;
}

typedef AsyncStateBuilder<T> = Widget Function(BuildContext context, T data);

class AsyncStateView<T> extends StatelessWidget {
  const AsyncStateView({
    super.key,
    required this.state,
    required this.builder,
    this.loadingBuilder,
    this.errorBuilder,
    this.emptyBuilder,
    this.emptyPredicate,
    this.onRetry,
  });

  final AsyncState<T> state;
  final AsyncStateBuilder<T> builder;
  final WidgetBuilder? loadingBuilder;
  final Widget Function(BuildContext context, String message, VoidCallback retry)?
      errorBuilder;
  final Widget Function(BuildContext context, String? message)? emptyBuilder;
  final bool Function(T data)? emptyPredicate;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading) {
      return loadingBuilder?.call(context) ??
          const Center(
            child: CircularProgressIndicator(),
          );
    }

    if (state.isError) {
      final String message = state.message ?? 'Something went wrong.';
      final VoidCallback retry = onRetry ?? () {};
      return errorBuilder?.call(context, message, retry) ??
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message,
                    textAlign: TextAlign.center,
                  ),
                  if (onRetry != null) ...[
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: retry,
                      child: const Text('Retry'),
                    ),
                  ],
                ],
              ),
            ),
          );
    }

    if (state.isEmpty) {
      return emptyBuilder?.call(context, state.message) ??
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                state.message ?? 'No results found.',
                textAlign: TextAlign.center,
              ),
            ),
          );
    }

    final T? data = state.data;
    if (data != null && emptyPredicate != null && emptyPredicate!(data)) {
      return emptyBuilder?.call(context, state.message) ??
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                state.message ?? 'No results found.',
                textAlign: TextAlign.center,
              ),
            ),
          );
    }

    if (data == null) {
      return emptyBuilder?.call(context, state.message) ??
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                state.message ?? 'No results found.',
                textAlign: TextAlign.center,
              ),
            ),
          );
    }

    return builder(context, data);
  }
}